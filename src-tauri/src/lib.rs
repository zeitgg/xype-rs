mod motion;

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_deep_link::DeepLinkExt;
use url::Url;

const API_BASE: &str = "https://xype.gg";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthSession {
    pub token: String,
    pub user_id: String,
    pub email: String,
    pub expires_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PublicAuthSession {
    pub user_id: String,
    pub email: String,
    pub expires_at: String,
}

impl From<&AuthSession> for PublicAuthSession {
    fn from(session: &AuthSession) -> Self {
        Self {
            user_id: session.user_id.clone(),
            email: session.email.clone(),
            expires_at: session.expires_at.clone(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct AccessCheck {
    pub access: bool,
    pub auth: bool,
    pub subscription: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EntitlementsResponse {
    is_paid: bool,
}

fn auth_session_path() -> Result<PathBuf, String> {
    let dir = std::env::var("LOCALAPPDATA")
        .or_else(|_| std::env::var("APPDATA"))
        .map_err(|e| e.to_string())?;
    Ok(PathBuf::from(dir).join("xype").join("auth.json"))
}

fn pending_auth_file() -> Result<PathBuf, String> {
    let dir = std::env::var("LOCALAPPDATA")
        .or_else(|_| std::env::var("APPDATA"))
        .map_err(|e| e.to_string())?;
    Ok(PathBuf::from(dir).join("xype").join(".pending_auth"))
}

fn store_auth_session(session: &AuthSession) -> Result<(), String> {
    let path = auth_session_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string(session).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}

fn load_auth_session_inner() -> Result<Option<AuthSession>, String> {
    let path = auth_session_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data)
        .map(Some)
        .map_err(|e| e.to_string())
}

fn parse_auth_callback(raw_url: &str) -> Result<AuthSession, String> {
    let parsed = Url::parse(raw_url).map_err(|e| e.to_string())?;
    let path = parsed.path();
    if parsed.scheme() != "xype"
        || parsed.host_str() != Some("auth")
        || (path != "/callback" && path != "/callback/")
    {
        return Err("Ignored non-auth deep link.".to_string());
    }

    let mut token = None;
    let mut user_id = None;
    let mut email = None;
    let mut expires_at = None;

    for (key, value) in parsed.query_pairs() {
        match key.as_ref() {
            "token" => token = Some(value.into_owned()),
            "user_id" => user_id = Some(value.into_owned()),
            "email" => email = Some(value.into_owned()),
            "expires_at" => expires_at = Some(value.into_owned()),
            _ => {}
        }
    }

    Ok(AuthSession {
        token: token
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Auth callback missing token.".to_string())?,
        user_id: user_id
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Auth callback missing user_id.".to_string())?,
        email: email
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Auth callback missing email.".to_string())?,
        expires_at: expires_at
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "Auth callback missing expires_at.".to_string())?,
    })
}

fn flush_pending_auth() -> Result<Option<AuthSession>, String> {
    let path = pending_auth_file()?;
    if !path.exists() {
        return Ok(None);
    }
    let raw_url = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(path);
    let session = parse_auth_callback(raw_url.trim())?;
    store_auth_session(&session)?;
    Ok(Some(session))
}

fn handle_auth_deep_link(app: &tauri::AppHandle, raw_url: &str) -> Result<(), String> {
    let session = parse_auth_callback(raw_url)?;
    store_auth_session(&session)?;
    app.emit("auth-session-updated", PublicAuthSession::from(&session))
        .map_err(|e| e.to_string())
}

async fn fetch_subscription_status(token: &str) -> Result<bool, String> {
    let response = reqwest::Client::new()
        .get(format!("{API_BASE}/api/me/entitlements"))
        .header("Authorization", format!("Bearer {token}"))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "Subscription check failed: HTTP {}",
            response.status()
        ));
    }

    let body = response
        .json::<EntitlementsResponse>()
        .await
        .map_err(|e| e.to_string())?;
    Ok(body.is_paid)
}

#[tauri::command]
fn get_auth_session() -> Result<Option<PublicAuthSession>, String> {
    let _ = flush_pending_auth();
    load_auth_session_inner().map(|session| session.as_ref().map(PublicAuthSession::from))
}

#[tauri::command]
fn logout_auth_session() -> Result<(), String> {
    let path = auth_session_path()?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn check_app_access_detailed() -> Result<AccessCheck, String> {
    let _ = flush_pending_auth();
    let session = match load_auth_session_inner()? {
        Some(session) => session,
        None => {
            return Ok(AccessCheck {
                access: false,
                auth: false,
                subscription: false,
                error: Some("Log in to verify your subscription.".to_string()),
            });
        }
    };

    match fetch_subscription_status(&session.token).await {
        Ok(true) => Ok(AccessCheck {
            access: true,
            auth: true,
            subscription: true,
            error: None,
        }),
        Ok(false) => Ok(AccessCheck {
            access: false,
            auth: true,
            subscription: false,
            error: Some("Subscription inactive.".to_string()),
        }),
        Err(error) => Ok(AccessCheck {
            access: false,
            auth: true,
            subscription: false,
            error: Some(error),
        }),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args = std::env::args().collect::<Vec<_>>();
    if let Some(url) = args
        .iter()
        .map(|arg| arg.trim_matches('"').trim())
        .find(|arg| arg.starts_with("xype://"))
    {
        if let Ok(path) = pending_auth_file() {
            if let Some(parent) = path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            let _ = fs::write(path, url);
        }
        std::process::exit(0);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            app.deep_link().register_all()?;

            let handle = app.handle().clone();
            if let Some(urls) = app.deep_link().get_current()? {
                for url in urls {
                    if let Err(error) = handle_auth_deep_link(&handle, url.as_str()) {
                        eprintln!("deep link auth failed: {error}");
                    }
                }
            }

            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    if let Err(error) = handle_auth_deep_link(&handle, url.as_str()) {
                        eprintln!("deep link auth failed: {error}");
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_auth_session,
            logout_auth_session,
            check_app_access_detailed,
            motion::pick_file,
            motion::read_text_file,
            motion::write_text_file,
            motion::check_ffmpeg_runtime,
            motion::install_ffmpeg_runtime,
            motion::validate_ffmpeg,
            motion::check_encoder_support,
            motion::get_video_fps,
            motion::check_motion_runtime,
            motion::install_motion_runtime,
            motion::render_video_motion_runtime,
            motion::compress_video_simple,
            motion::compress_video_custom,
            motion::compress_discord_simple,
            motion::upscale_youtube_4k_simple,
            motion::tiktok_quality_patch,
            motion::trim_video_simple,
            motion::trim_video_queue_segment,
            motion::cleanup_motion_queue_file,
            motion::trim_video_segments,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
