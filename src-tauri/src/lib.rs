mod motion;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            motion::pick_file,
            motion::check_ffmpeg_runtime,
            motion::install_ffmpeg_runtime,
            motion::validate_ffmpeg,
            motion::get_video_fps,
            motion::check_motion_runtime,
            motion::install_motion_runtime,
            motion::render_video_motion_runtime,
            motion::compress_video_simple,
            motion::compress_discord_simple,
            motion::upscale_youtube_4k_simple,
            motion::tiktok_fps_simple,
            motion::trim_video_simple,
            motion::trim_video_segments,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
