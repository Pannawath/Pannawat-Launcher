/// IPC commands for launching Minecraft
use tauri::AppHandle;

#[derive(serde::Deserialize)]
pub struct LaunchRequest {
    pub profile_id: String,
    pub username: String,
}

#[tauri::command]
pub async fn launch_game(app: AppHandle, req: LaunchRequest) -> Result<(), String> {
    // TODO: full launch pipeline
    // 1. auth::OfflineSession::new(&req.username)
    // 2. game_runtime: resolve version JSON + fabric profile
    // 3. downloader: verify + download missing assets/libs
    // 4. jvm_builder: build args, spawn process
    // 5. stream stdout/stderr back via tauri events
    tracing::info!("Launch requested for profile: {}", req.profile_id);
    Ok(())
}

#[tauri::command]
pub async fn kill_game(_app: AppHandle) -> Result<(), String> {
    // TODO: kill the spawned game process
    Ok(())
}
