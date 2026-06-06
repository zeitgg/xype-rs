use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{Emitter, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;
const MOTION_SCRIPT: &str = include_str!("../resources/motion-runtime/xype_motion.vpy");
const FFMPEG_URL: &str = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResult {
    pub success: bool,
    pub message: String,
    pub output_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncoderSupport {
    pub h264_nvenc: bool,
}

#[derive(Debug, Deserialize)]
pub struct TrimSegment {
    pub start: f64,
    pub end: f64,
}

fn hidden_cmd(path: &PathBuf) -> Command {
    let mut cmd = Command::new(path);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

fn motion_runtime_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("motion-runtime"))
}

fn ffmpeg_runtime_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("ffmpeg-runtime"))
}

fn find_named_file(root: &PathBuf, name: &str) -> Option<PathBuf> {
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && path
                .file_name()
                .and_then(|value| value.to_str())
                .map(|value| value.eq_ignore_ascii_case(name))
                .unwrap_or(false)
        {
            return Some(path);
        }
        if path.is_dir() {
            if let Some(found) = find_named_file(&path, name) {
                return Some(found);
            }
        }
    }
    None
}

fn bundled_motion_script(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("motion-runtime")
        .join("xype_motion.vpy"))
}

fn bundled_mask_path(app: &tauri::AppHandle, preset: &str) -> Result<Option<PathBuf>, String> {
    let file_name = match preset {
        "valorant-minimal" => "valorant-minimal.png",
        "valorant-detailed" => "valorant-detailed.png",
        _ => return Ok(None),
    };

    Ok(Some(
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("masks")
            .join(file_name),
    ))
}

fn refresh_motion_script(app: &tauri::AppHandle, runtime_dir: &PathBuf) -> Result<(), String> {
    let bundled_script = bundled_motion_script(app)?;
    if bundled_script.exists() {
        fs::copy(&bundled_script, runtime_dir.join("xype_motion.vpy"))
            .map_err(|e| e.to_string())?;
    } else {
        fs::write(runtime_dir.join("xype_motion.vpy"), MOTION_SCRIPT).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn merge_smoothie_recipe_ini(base: &mut Value, ini: &str) {
    let Some(data) = base.get_mut("data").and_then(|value| value.as_object_mut()) else {
        return;
    };

    let mut section = String::new();
    for raw_line in ini.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            section = line[1..line.len() - 1].trim().to_lowercase();
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        if let Some(target) = data
            .get_mut(&section)
            .and_then(|value| value.as_object_mut())
        {
            target.insert(
                key.trim().to_lowercase(),
                Value::String(value.trim().trim_matches('"').to_string()),
            );
        }
    }
}

fn probe_duration(ffmpeg: &PathBuf, input: &PathBuf) -> f64 {
    if let Some(parent) = ffmpeg.parent() {
        let ffprobe = parent.join("ffprobe.exe");
        if ffprobe.exists() {
            if let Ok(out) = hidden_cmd(&ffprobe)
                .args([
                    "-v",
                    "0",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    input.to_str().unwrap_or_default(),
                ])
                .output()
            {
                if let Ok(duration) = String::from_utf8_lossy(&out.stdout).trim().parse::<f64>() {
                    return duration;
                }
            }
        }
    }

    if let Ok(out) = hidden_cmd(ffmpeg).arg("-i").arg(input).output() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        for line in stderr.lines() {
            if let Some(pos) = line.find("Duration: ") {
                let value = &line[pos + 10..];
                let parts: Vec<&str> = value.split(':').collect();
                if parts.len() >= 3 {
                    if let (Ok(hours), Ok(minutes)) =
                        (parts[0].trim().parse::<f64>(), parts[1].parse::<f64>())
                    {
                        if let Ok(seconds) = parts[2]
                            .split(',')
                            .next()
                            .unwrap_or_default()
                            .trim()
                            .parse::<f64>()
                        {
                            return hours * 3600.0 + minutes * 60.0 + seconds;
                        }
                    }
                }
            }
        }
    }

    0.0
}

fn audio_tempo_filter(timescale: f64) -> String {
    let mut filters = Vec::new();
    let mut remaining = timescale;

    if remaining > 1.0 {
        while remaining > 2.0 {
            filters.push("atempo=2.0".to_string());
            remaining /= 2.0;
        }
    } else {
        while remaining < 0.5 {
            filters.push("atempo=0.5".to_string());
            remaining *= 2.0;
        }
    }

    filters.push(format!("atempo={remaining:.6}"));
    filters.join(",")
}

#[tauri::command]
pub fn pick_file(kind: String) -> Result<Option<String>, String> {
    let (title, filter) = match kind.as_str() {
        "ffmpeg" => ("Select ffmpeg.exe", "Executables (*.exe)|*.exe"),
        "mask" => ("Select mask PNG", "PNG masks (*.png)|*.png"),
        "preset" => ("Select xype preset", "xype presets (*.vro)|*.vro"),
        _ => (
            "Select video",
            "Video files (*.mp4;*.mov;*.mkv;*.avi;*.webm)|*.mp4;*.mov;*.mkv;*.avi;*.webm",
        ),
    };

    let script = format!(
        r#"Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = "{title}"
$dialog.Filter = "{filter}"
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
  [Console]::Write($dialog.FileName)
}}"#
    );

    let output = hidden_cmd(&PathBuf::from("powershell"))
        .args(["-NoProfile", "-STA", "-Command", &script])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok((!path.is_empty()).then_some(path))
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(PathBuf::from(path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(PathBuf::from(path), contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_ffmpeg_runtime(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = ffmpeg_runtime_dir(&app)?;
    Ok(find_named_file(&dir, "ffmpeg.exe").map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn install_ffmpeg_runtime(app: tauri::AppHandle) -> Result<ProcessResult, String> {
    let runtime_dir = ffmpeg_runtime_dir(&app)?;
    fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;
    let _ = app.emit("ffmpeg-runtime-progress", 5_u32);

    let archive_path = std::env::temp_dir().join("xype-ffmpeg.zip");
    let bytes = reqwest::Client::new()
        .get(FFMPEG_URL)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    fs::write(&archive_path, &bytes).map_err(|e| e.to_string())?;
    let _ = app.emit("ffmpeg-runtime-progress", 60_u32);

    let script = format!(
        r#"$ErrorActionPreference = "Stop"
if (Test-Path -LiteralPath "{runtime}") {{
  Get-ChildItem -LiteralPath "{runtime}" | Remove-Item -Recurse -Force
}}
Expand-Archive -LiteralPath "{archive}" -DestinationPath "{runtime}" -Force
"#,
        archive = archive_path.to_string_lossy(),
        runtime = runtime_dir.to_string_lossy(),
    );
    let output = hidden_cmd(&PathBuf::from("powershell"))
        .args(["-NoProfile", "-Command", &script])
        .output()
        .map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&archive_path);

    if !output.status.success() {
        return Ok(ProcessResult {
            success: false,
            message: String::from_utf8_lossy(&output.stderr).trim().to_string(),
            output_path: None,
        });
    }

    let Some(ffmpeg) = find_named_file(&runtime_dir, "ffmpeg.exe") else {
        return Ok(ProcessResult {
            success: false,
            message: "FFmpeg install finished, but ffmpeg.exe was not found.".to_string(),
            output_path: None,
        });
    };

    let _ = app.emit("ffmpeg-runtime-progress", 100_u32);
    Ok(ProcessResult {
        success: true,
        message: "Video tools installed".to_string(),
        output_path: Some(ffmpeg.to_string_lossy().to_string()),
    })
}

#[tauri::command]
pub fn validate_ffmpeg(ffmpeg_path: &str) -> bool {
    let path = PathBuf::from(ffmpeg_path);
    if !path.exists() {
        return false;
    }

    hidden_cmd(&path)
        .arg("-version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub fn check_encoder_support(ffmpeg_path: &str) -> Result<EncoderSupport, String> {
    let ffmpeg = PathBuf::from(ffmpeg_path);
    if !ffmpeg.exists() {
        return Ok(EncoderSupport { h264_nvenc: false });
    }

    let output = hidden_cmd(&ffmpeg)
        .arg("-hide_banner")
        .arg("-encoders")
        .output()
        .map_err(|e| e.to_string())?;
    let encoders = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    Ok(EncoderSupport {
        h264_nvenc: encoders.contains("h264_nvenc"),
    })
}

#[tauri::command]
pub fn get_video_fps(ffmpeg_path: &str, video_path: &str) -> Result<f64, String> {
    let ffmpeg = PathBuf::from(ffmpeg_path);
    let video = PathBuf::from(video_path);

    if !ffmpeg.exists() {
        return Err("FFmpeg executable not found".to_string());
    }
    if !video.exists() {
        return Err("Video file not found".to_string());
    }

    if let Some(parent) = ffmpeg.parent() {
        let ffprobe = parent.join("ffprobe.exe");
        if ffprobe.exists() {
            let output = hidden_cmd(&ffprobe)
                .args([
                    "-v",
                    "0",
                    "-select_streams",
                    "v:0",
                    "-show_entries",
                    "stream=avg_frame_rate",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    video_path,
                ])
                .output()
                .map_err(|e| e.to_string())?;
            let raw = String::from_utf8_lossy(&output.stdout);
            let value = raw.trim();
            if let Some((num, den)) = value.split_once('/') {
                let num: f64 = num.parse().map_err(|_| "Invalid FPS numerator")?;
                let den: f64 = den.parse().map_err(|_| "Invalid FPS denominator")?;
                if den != 0.0 {
                    return Ok(num / den);
                }
            }
            if let Ok(fps) = value.parse::<f64>() {
                return Ok(fps);
            }
        }
    }

    Err("Could not detect video FPS. Place ffprobe beside ffmpeg.".to_string())
}

#[tauri::command]
pub fn check_motion_runtime(app: tauri::AppHandle) -> Result<bool, String> {
    let dir = motion_runtime_dir(&app)?;
    let scripts_dir = dir.join("scripts");
    Ok(find_named_file(&dir, "vspipe.exe").is_some()
        && dir.join("xype_motion.vpy").exists()
        && scripts_dir.join("havsfunc.py").exists()
        && scripts_dir.join("blending.py").exists())
}

#[tauri::command]
pub async fn install_motion_runtime(app: tauri::AppHandle) -> Result<ProcessResult, String> {
    let runtime_dir = motion_runtime_dir(&app)?;
    let scripts_dir = runtime_dir.join("scripts");
    fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&scripts_dir).map_err(|e| e.to_string())?;
    fs::write(scripts_dir.join("__init__.py"), b"").map_err(|e| e.to_string())?;
    refresh_motion_script(&app, &runtime_dir)?;
    let _ = app.emit("motion-runtime-progress", 5_u32);

    let archive_path = std::env::temp_dir().join("xype-vapoursynth.7z");
    let client = reqwest::Client::new();
    let response = client
        .get("https://github.com/couleurm/VSBundler/releases/latest/download/VapourSynth.7z")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    fs::write(&archive_path, &bytes).map_err(|e| e.to_string())?;
    let _ = app.emit("motion-runtime-progress", 50_u32);

    sevenz_rust2::decompress_file(&archive_path, &runtime_dir)
        .map_err(|e| format!("Failed to extract VapourSynth: {e}"))?;
    let _ = fs::remove_file(&archive_path);
    let _ = app.emit("motion-runtime-progress", 70_u32);

    let nested = runtime_dir.join("VapourSynth");
    if nested.exists() {
        for entry in fs::read_dir(&nested).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let _ = fs::rename(entry.path(), runtime_dir.join(entry.file_name()));
        }
        let _ = fs::remove_dir_all(&nested);
    }

    let script_urls = [
        (
            "https://raw.githubusercontent.com/couleur-tweak-tips/smoothie-rs/main/target/scripts/havsfunc.py",
            "havsfunc.py",
        ),
        (
            "https://raw.githubusercontent.com/couleur-tweak-tips/smoothie-rs/main/target/scripts/blending.py",
            "blending.py",
        ),
        (
            "https://raw.githubusercontent.com/couleur-tweak-tips/smoothie-rs/main/target/scripts/consts.py",
            "consts.py",
        ),
        (
            "https://raw.githubusercontent.com/couleur-tweak-tips/smoothie-rs/main/target/scripts/weighting.py",
            "weighting.py",
        ),
    ];

    for (index, (url, name)) in script_urls.iter().enumerate() {
        let response = client.get(*url).send().await.map_err(|e| e.to_string())?;
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        fs::write(scripts_dir.join(name), &bytes).map_err(|e| e.to_string())?;
        let progress = 75 + ((index + 1) * 25 / script_urls.len()) as u32;
        let _ = app.emit("motion-runtime-progress", progress);
    }

    Ok(ProcessResult {
        success: true,
        message: "Motion engine installed".to_string(),
        output_path: Some(runtime_dir.to_string_lossy().to_string()),
    })
}

#[tauri::command]
pub async fn render_video_motion_runtime(
    app: tauri::AppHandle,
    ffmpeg_path: String,
    input_path: String,
    interpolation_enabled: bool,
    interpolate_fps: u32,
    interpolation_speed: String,
    interpolation_tuning: String,
    interpolation_algorithm: u32,
    interpolation_gpu: bool,
    frame_blending_enabled: bool,
    output_fps: u32,
    blur_intensity: f64,
    blend_weighting: String,
    flowblur_enabled: bool,
    flowblur_amount: u32,
    encoder: String,
    crf: u32,
    timescale: f64,
    output_dir: Option<String>,
    output_name: Option<String>,
    mask_preset: String,
    mask_path: String,
    smoothie_recipe: Option<String>,
) -> Result<ProcessResult, String> {
    let input = PathBuf::from(&input_path);
    let ffmpeg = PathBuf::from(&ffmpeg_path);

    if !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Input video not found".to_string(),
            output_path: None,
        });
    }
    if !ffmpeg.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "FFmpeg executable not found".to_string(),
            output_path: None,
        });
    }

    let runtime = motion_runtime_dir(&app)?;
    refresh_motion_script(&app, &runtime)?;
    let vspipe = find_named_file(&runtime, "vspipe.exe").unwrap_or_else(|| runtime.join("vspipe.exe"));
    let script = runtime.join("xype_motion.vpy");
    if !vspipe.exists() || !script.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Install the motion engine before rendering.".to_string(),
            output_path: None,
        });
    }

    let duration = probe_duration(&ffmpeg, &input);
    let effective_timescale = if timescale > 0.0 { timescale } else { 1.0 };
    let output_duration = if effective_timescale != 1.0 {
        duration / effective_timescale
    } else {
        duration
    };

    let input_dir = input.parent().unwrap_or_else(|| std::path::Path::new("."));
    let input_name = input
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("output");
    let output_dir = output_dir
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| input_dir.to_path_buf());
    let output_name = output_name
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(sanitize_output_name)
        .unwrap_or_else(|| format!("{input_name}_motion"));
    let output_path = output_dir.join(format!("{output_name}.mp4"));
    if output_path.exists() {
        let _ = fs::remove_file(&output_path);
    }

    let working_fps = interpolate_fps.max(output_fps).max(1);
    let blur_intensity = blur_intensity.clamp(0.0, 4.0);
    let resolved_mask_path = if mask_preset == "custom" && !mask_path.trim().is_empty() {
        Some(PathBuf::from(mask_path.trim()))
    } else {
        bundled_mask_path(&app, &mask_preset)?
    }
    .filter(|path| path.exists());
    let mask_path_value = resolved_mask_path
        .as_ref()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();
    let mut recipe_value = serde_json::json!({
        "data": {
            "interpolation": {
                "enabled": if interpolation_enabled && interpolate_fps > 0 { "yes" } else { "no" },
                "fps": working_fps.to_string(),
                "speed": interpolation_speed,
                "tuning": interpolation_tuning,
                "algorithm": interpolation_algorithm.to_string(),
                "block size": "auto",
                "use gpu": if interpolation_gpu { "yes" } else { "no" }
            },
            "frame blending": {
                "enabled": if frame_blending_enabled && blur_intensity > 0.0 { "yes" } else { "no" },
                "fps": output_fps.to_string(),
                "intensity": blur_intensity.to_string(),
                "weighting": blend_weighting
            },
            "flowblur": {
                "enabled": if flowblur_enabled && flowblur_amount > 0 { "yes" } else { "no" },
                "amount": flowblur_amount.to_string(),
                "do blending": "after"
            },
            "mask": {
                "enabled": if !mask_path_value.is_empty() { "yes" } else { "no" },
                "path": mask_path_value
            },
            "miscellaneous": {
                "source plugin": "bestsource",
                "always verbose": "no"
            },
            "timescale": {
                "in": "1.0",
                "out": effective_timescale.to_string()
            }
        }
    });
    if let Some(recipe_text) = smoothie_recipe
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        merge_smoothie_recipe_ini(&mut recipe_value, recipe_text);
    }
    let recipe = recipe_value.to_string();

    let mut path_env = runtime.to_string_lossy().to_string();
    if let Some(vspipe_dir) = vspipe.parent() {
        path_env.push(';');
        path_env.push_str(&vspipe_dir.to_string_lossy());
    }
    if let Ok(existing) = std::env::var("PATH") {
        path_env.push(';');
        path_env.push_str(&existing);
    }

    let mut vs_cmd = hidden_cmd(&vspipe);
    vs_cmd
        .current_dir(&runtime)
        .env("PATH", path_env)
        .arg("--container")
        .arg("y4m")
        .arg("-")
        .arg(&script)
        .arg("--arg")
        .arg(format!("recipe={recipe}"))
        .arg("--arg")
        .arg(format!("input_video={}", input.to_string_lossy()))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut vs_child = vs_cmd.spawn().map_err(|e| e.to_string())?;
    let vs_stdout = vs_child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture VSPipe output".to_string())?;
    let vs_stderr = vs_child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture VSPipe errors".to_string())?;

    let is_nvenc = encoder == "h264_nvenc";
    let codec = if is_nvenc { "h264_nvenc" } else { "libx264" };
    let quality_flag = if is_nvenc { "-cq" } else { "-crf" };
    let preset = if is_nvenc { "p5" } else { "slow" };
    let audio_filter = ((effective_timescale - 1.0).abs() > 0.001)
        .then(|| audio_tempo_filter(effective_timescale));

    let mut ff_cmd = hidden_cmd(&ffmpeg);
    ff_cmd
        .stdin(Stdio::from(vs_stdout))
        .arg("-y")
        .arg("-f")
        .arg("yuv4mpegpipe")
        .arg("-i")
        .arg("-")
        .arg("-i")
        .arg(&input)
        .arg("-map")
        .arg("0:v:0")
        .arg("-map")
        .arg("1:a?")
        .arg("-shortest")
        .arg("-c:v")
        .arg(codec)
        .arg(quality_flag)
        .arg(crf.to_string());

    if is_nvenc {
        ff_cmd
            .arg("-pix_fmt")
            .arg("yuv420p")
            .arg("-preset")
            .arg(preset);
    } else {
        ff_cmd
            .arg("-preset")
            .arg(preset)
            .arg("-pix_fmt")
            .arg("yuv420p");
    }

    if let Some(filter) = audio_filter {
        ff_cmd.arg("-af").arg(filter).arg("-c:a").arg("aac");
    } else {
        ff_cmd.arg("-c:a").arg("copy");
    }

    ff_cmd
        .arg("-progress")
        .arg("pipe:1")
        .arg("-nostats")
        .arg(&output_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut ff_child = ff_cmd.spawn().map_err(|e| e.to_string())?;
    let ff_stdout = ff_child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture FFmpeg progress".to_string())?;
    let ff_stderr = ff_child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture FFmpeg errors".to_string())?;

    let app_clone = app.clone();
    let progress_handle = std::thread::spawn(move || {
        let reader = BufReader::new(ff_stdout);
        for line in reader.lines().map_while(Result::ok) {
            if let Some(raw) = line.strip_prefix("out_time_ms=") {
                if let Ok(microseconds) = raw.parse::<f64>() {
                    if output_duration > 0.0 {
                        let pct = (microseconds / 1_000_000.0 / output_duration).min(1.0);
                        let _ = app_clone.emit("render-progress", pct);
                    }
                }
            }
        }
    });

    let vs_stderr_handle = std::thread::spawn(move || {
        BufReader::new(vs_stderr)
            .lines()
            .map_while(Result::ok)
            .collect::<Vec<_>>()
            .join("\n")
    });
    let ff_stderr_handle = std::thread::spawn(move || {
        BufReader::new(ff_stderr)
            .lines()
            .map_while(Result::ok)
            .collect::<Vec<_>>()
            .join("\n")
    });

    let ff_status = ff_child.wait().map_err(|e| e.to_string())?;
    let vs_status = vs_child.wait().map_err(|e| e.to_string())?;
    let _ = progress_handle.join();
    let vs_stderr_output = vs_stderr_handle.join().unwrap_or_default();
    let ff_stderr_output = ff_stderr_handle.join().unwrap_or_default();
    let _ = app.emit("render-progress", 1.0_f64);

    if ff_status.success() && vs_status.success() && output_path.exists() {
        Ok(ProcessResult {
            success: true,
            message: format!("Rendered motion blur at {output_fps} FPS"),
            output_path: output_path.to_str().map(str::to_string),
        })
    } else {
        Ok(ProcessResult {
            success: false,
            message: format!("Motion engine error:\n{vs_stderr_output}\n{ff_stderr_output}"),
            output_path: None,
        })
    }
}

fn input_output_path(input: &PathBuf, suffix: &str, extension: &str) -> PathBuf {
    let input_dir = input.parent().unwrap_or_else(|| std::path::Path::new("."));
    let input_name = input
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("output");
    input_dir.join(format!("{input_name}_{suffix}.{extension}"))
}

fn sanitize_output_name(name: &str) -> String {
    let sanitized = name
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => ch,
        })
        .collect::<String>();
    let trimmed = sanitized.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        "output_motion".to_string()
    } else {
        trimmed
    }
}

fn spawn_ffmpeg_with_progress(
    app: tauri::AppHandle,
    mut cmd: Command,
    output_path: PathBuf,
    duration: f64,
    success_message: String,
) -> Result<ProcessResult, String> {
    cmd.arg("-progress")
        .arg("pipe:1")
        .arg("-nostats")
        .arg(&output_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture FFmpeg progress".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture FFmpeg errors".to_string())?;

    let progress_app = app.clone();
    let progress_handle = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            let parsed = line
                .strip_prefix("out_time_us=")
                .or_else(|| line.strip_prefix("out_time_ms="))
                .and_then(|value| value.parse::<f64>().ok());
            if let Some(microseconds) = parsed {
                if duration > 0.0 {
                    let pct = (microseconds / 1_000_000.0 / duration).min(1.0);
                    let _ = progress_app.emit("render-progress", pct);
                }
            }
        }
    });

    let stderr_handle = std::thread::spawn(move || {
        BufReader::new(stderr)
            .lines()
            .map_while(Result::ok)
            .collect::<Vec<_>>()
            .join("\n")
    });

    let status = child.wait().map_err(|e| e.to_string())?;
    let _ = progress_handle.join();
    let stderr_output = stderr_handle.join().unwrap_or_default();
    let _ = app.emit("render-progress", 1.0_f64);

    if status.success() && output_path.exists() {
        Ok(ProcessResult {
            success: true,
            message: success_message,
            output_path: output_path.to_str().map(str::to_string),
        })
    } else {
        Ok(ProcessResult {
            success: false,
            message: format!("FFmpeg error: {stderr_output}"),
            output_path: None,
        })
    }
}

#[tauri::command]
pub async fn compress_video_simple(
    app: tauri::AppHandle,
    ffmpeg_path: String,
    input_path: String,
) -> Result<ProcessResult, String> {
    let ffmpeg = PathBuf::from(&ffmpeg_path);
    let input = PathBuf::from(&input_path);
    if !ffmpeg.exists() || !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Missing FFmpeg or input video".to_string(),
            output_path: None,
        });
    }

    let duration = probe_duration(&ffmpeg, &input);
    let output_path = input_output_path(&input, "compressed", "mp4");
    let mut cmd = hidden_cmd(&ffmpeg);
    cmd.stdin(Stdio::null())
        .arg("-y")
        .arg("-i")
        .arg(&input)
        .arg("-vf")
        .arg("scale=-2:'min(ih,1080)',format=yuv420p")
        .arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("slow")
        .arg("-crf")
        .arg("23")
        .arg("-c:a")
        .arg("aac")
        .arg("-b:a")
        .arg("160k")
        .arg("-movflags")
        .arg("+faststart");

    spawn_ffmpeg_with_progress(
        app,
        cmd,
        output_path,
        duration,
        "Compressed video".to_string(),
    )
}

#[tauri::command]
pub async fn compress_discord_simple(
    app: tauri::AppHandle,
    ffmpeg_path: String,
    input_path: String,
) -> Result<ProcessResult, String> {
    let ffmpeg = PathBuf::from(&ffmpeg_path);
    let input = PathBuf::from(&input_path);
    if !ffmpeg.exists() || !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Missing FFmpeg or input video".to_string(),
            output_path: None,
        });
    }

    let duration = probe_duration(&ffmpeg, &input);
    let output_path = input_output_path(&input, "discord", "mp4");
    let target_bits = 7.5_f64 * 1024.0 * 1024.0 * 8.0;
    let audio_kbps = 96.0;
    let video_kbps = ((target_bits / duration) / 1000.0 - audio_kbps).max(120.0);
    let height = if video_kbps >= 1500.0 { 720 } else { 480 };

    let mut cmd = hidden_cmd(&ffmpeg);
    cmd.stdin(Stdio::null())
        .arg("-y")
        .arg("-i")
        .arg(&input)
        .arg("-vf")
        .arg(format!("scale=-2:{height},fps=30,format=yuv420p"))
        .arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("veryfast")
        .arg("-b:v")
        .arg(format!("{}k", video_kbps.round() as u32))
        .arg("-maxrate")
        .arg(format!("{}k", (video_kbps * 1.2).round() as u32))
        .arg("-bufsize")
        .arg(format!("{}k", (video_kbps * 2.0).round() as u32))
        .arg("-c:a")
        .arg("aac")
        .arg("-b:a")
        .arg("96k")
        .arg("-movflags")
        .arg("+faststart");

    spawn_ffmpeg_with_progress(
        app,
        cmd,
        output_path,
        duration,
        "Compressed for Discord".to_string(),
    )
}

#[tauri::command]
pub async fn upscale_youtube_4k_simple(
    app: tauri::AppHandle,
    ffmpeg_path: String,
    input_path: String,
) -> Result<ProcessResult, String> {
    let ffmpeg = PathBuf::from(&ffmpeg_path);
    let input = PathBuf::from(&input_path);
    if !ffmpeg.exists() || !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Missing FFmpeg or input video".to_string(),
            output_path: None,
        });
    }

    let duration = probe_duration(&ffmpeg, &input);
    let output_path = input_output_path(&input, "youtube_4k", "mkv");
    let mut cmd = hidden_cmd(&ffmpeg);
    cmd.stdin(Stdio::null())
        .arg("-y")
        .arg("-i")
        .arg(&input)
        .arg("-vf")
        .arg("zscale=-2:2160:f=lanczos,format=yuv420p")
        .arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("slower")
        .arg("-crf")
        .arg("15")
        .arg("-c:a")
        .arg("copy");

    spawn_ffmpeg_with_progress(
        app,
        cmd,
        output_path,
        duration,
        "Prepared YouTube 4K copy".to_string(),
    )
}

#[tauri::command]
pub fn tiktok_fps_simple(
    ffmpeg_path: String,
    input_path: String,
    fps: u32,
) -> Result<ProcessResult, String> {
    let ffmpeg = PathBuf::from(&ffmpeg_path);
    let input = PathBuf::from(&input_path);
    if !ffmpeg.exists() || !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Missing FFmpeg or input video".to_string(),
            output_path: None,
        });
    }

    let scale = match fps {
        60 => 2,
        120 => 6,
        240 => 12,
        _ => 2,
    };
    let output_path = input_output_path(&input, "tiktok", "mp4");
    let output = hidden_cmd(&ffmpeg)
        .arg("-y")
        .arg("-itsscale")
        .arg(scale.to_string())
        .arg("-i")
        .arg(&input)
        .arg("-c:v")
        .arg("copy")
        .arg("-c:a")
        .arg("copy")
        .arg(&output_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() && output_path.exists() {
        Ok(ProcessResult {
            success: true,
            message: "Prepared TikTok FPS copy".to_string(),
            output_path: output_path.to_str().map(str::to_string),
        })
    } else {
        Ok(ProcessResult {
            success: false,
            message: format!("FFmpeg error: {}", String::from_utf8_lossy(&output.stderr)),
            output_path: None,
        })
    }
}

#[tauri::command]
pub fn trim_video_simple(
    ffmpeg_path: String,
    input_path: String,
    start_seconds: f64,
    end_seconds: f64,
) -> Result<ProcessResult, String> {
    let ffmpeg = PathBuf::from(&ffmpeg_path);
    let input = PathBuf::from(&input_path);
    if !ffmpeg.exists() || !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Missing FFmpeg or input video".to_string(),
            output_path: None,
        });
    }
    if start_seconds < 0.0 || end_seconds <= start_seconds {
        return Ok(ProcessResult {
            success: false,
            message: "Choose a valid start and end time.".to_string(),
            output_path: None,
        });
    }

    let output_path = input_output_path(&input, "trim", "mp4");
    let output = hidden_cmd(&ffmpeg)
        .arg("-y")
        .arg("-ss")
        .arg(format!("{start_seconds:.3}"))
        .arg("-to")
        .arg(format!("{end_seconds:.3}"))
        .arg("-i")
        .arg(&input)
        .arg("-c:v")
        .arg("copy")
        .arg("-c:a")
        .arg("copy")
        .arg("-avoid_negative_ts")
        .arg("make_zero")
        .arg(&output_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() && output_path.exists() {
        Ok(ProcessResult {
            success: true,
            message: "Trimmed clip".to_string(),
            output_path: output_path.to_str().map(str::to_string),
        })
    } else {
        Ok(ProcessResult {
            success: false,
            message: format!("FFmpeg error: {}", String::from_utf8_lossy(&output.stderr)),
            output_path: None,
        })
    }
}

#[tauri::command]
pub fn trim_video_queue_segment(
    app: tauri::AppHandle,
    ffmpeg_path: String,
    input_path: String,
    start_seconds: f64,
    end_seconds: f64,
    index: u32,
) -> Result<ProcessResult, String> {
    let ffmpeg = PathBuf::from(&ffmpeg_path);
    let input = PathBuf::from(&input_path);
    if !ffmpeg.exists() || !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Missing FFmpeg or input video".to_string(),
            output_path: None,
        });
    }
    if start_seconds < 0.0 || end_seconds <= start_seconds {
        return Ok(ProcessResult {
            success: false,
            message: "Choose a valid start and end time.".to_string(),
            output_path: None,
        });
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("motion-queue");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let output_path = cache_dir.join(format!("segment-{stamp}-{index:04}.mp4"));

    let output = hidden_cmd(&ffmpeg)
        .arg("-y")
        .arg("-ss")
        .arg(format!("{start_seconds:.3}"))
        .arg("-to")
        .arg(format!("{end_seconds:.3}"))
        .arg("-i")
        .arg(&input)
        .arg("-map")
        .arg("0")
        .arg("-c")
        .arg("copy")
        .arg("-avoid_negative_ts")
        .arg("make_zero")
        .arg(&output_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() && output_path.exists() {
        Ok(ProcessResult {
            success: true,
            message: "Prepared segment".to_string(),
            output_path: output_path.to_str().map(str::to_string),
        })
    } else {
        Ok(ProcessResult {
            success: false,
            message: format!("FFmpeg error: {}", String::from_utf8_lossy(&output.stderr)),
            output_path: None,
        })
    }
}

#[tauri::command]
pub fn cleanup_motion_queue_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("motion-queue");
    let target = PathBuf::from(path);
    if target.starts_with(&cache_dir) && target.is_file() {
        fs::remove_file(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn trim_video_segments(
    app: tauri::AppHandle,
    ffmpeg_path: String,
    input_path: String,
    segments: Vec<TrimSegment>,
) -> Result<ProcessResult, String> {
    let ffmpeg = PathBuf::from(&ffmpeg_path);
    let input = PathBuf::from(&input_path);
    if !ffmpeg.exists() || !input.exists() {
        return Ok(ProcessResult {
            success: false,
            message: "Missing FFmpeg or input video".to_string(),
            output_path: None,
        });
    }

    let valid_segments = segments
        .into_iter()
        .filter(|segment| segment.start >= 0.0 && segment.end > segment.start)
        .collect::<Vec<_>>();
    if valid_segments.is_empty() {
        return Ok(ProcessResult {
            success: false,
            message: "Add at least one valid segment.".to_string(),
            output_path: None,
        });
    }

    if valid_segments.len() == 1 {
        let segment = &valid_segments[0];
        return trim_video_simple(ffmpeg_path, input_path, segment.start, segment.end);
    }

    let output_path = input_output_path(&input, "segments", "mp4");
    if output_path.exists() {
        let _ = fs::remove_file(&output_path);
    }

    let temp_dir = std::env::temp_dir().join(format!(
        "xype-segments-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or_default()
    ));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let total_steps = valid_segments.len() + 1;
    let mut part_paths = Vec::with_capacity(valid_segments.len());
    for (index, segment) in valid_segments.iter().enumerate() {
        let part_path = temp_dir.join(format!("segment-{index:04}.mp4"));
        let output = hidden_cmd(&ffmpeg)
            .arg("-y")
            .arg("-ss")
            .arg(format!("{:.3}", segment.start))
            .arg("-to")
            .arg(format!("{:.3}", segment.end))
            .arg("-i")
            .arg(&input)
            .arg("-map")
            .arg("0")
            .arg("-c")
            .arg("copy")
            .arg("-avoid_negative_ts")
            .arg("make_zero")
            .arg(&part_path)
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() || !part_path.exists() {
            let _ = fs::remove_dir_all(&temp_dir);
            return Ok(ProcessResult {
                success: false,
                message: format!("FFmpeg error: {}", String::from_utf8_lossy(&output.stderr)),
                output_path: None,
            });
        }

        part_paths.push(part_path);
        let _ = app.emit(
            "render-progress",
            ((index + 1) as f64 / total_steps as f64).min(0.95),
        );
    }

    let list_path = temp_dir.join("segments.txt");
    let list_content = part_paths
        .iter()
        .map(|path| format!("file '{}'", path.to_string_lossy().replace('\\', "/").replace('\'', "'\\''")))
        .collect::<Vec<_>>()
        .join("\n");
    fs::write(&list_path, list_content).map_err(|e| e.to_string())?;

    let output = hidden_cmd(&ffmpeg)
        .arg("-y")
        .arg("-f")
        .arg("concat")
        .arg("-safe")
        .arg("0")
        .arg("-i")
        .arg(&list_path)
        .arg("-c")
        .arg("copy")
        .arg(&output_path)
        .output()
        .map_err(|e| e.to_string())?;
    let _ = fs::remove_dir_all(&temp_dir);
    let _ = app.emit("render-progress", 1.0_f64);

    if output.status.success() && output_path.exists() {
        Ok(ProcessResult {
            success: true,
            message: format!("Merged {} segments", valid_segments.len()),
            output_path: output_path.to_str().map(str::to_string),
        })
    } else {
        Ok(ProcessResult {
            success: false,
            message: format!("FFmpeg error: {}", String::from_utf8_lossy(&output.stderr)),
            output_path: None,
        })
    }
}
