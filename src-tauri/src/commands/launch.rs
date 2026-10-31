use anyhow::Context;
use auth::OfflineSession;
use game_runtime::{ensure_java_runtime, prepare_game_environment};
use jvm_builder::{spawn_game, JvmConfig};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

#[derive(serde::Deserialize)]
pub struct LaunchRequest {
    pub profile_id: String,
    pub username: String,
    pub mc_version: String,
    pub fabric_version: Option<String>,
    pub min_ram_mb: Option<u32>,
    pub max_ram_mb: Option<u32>,
}

#[derive(serde::Serialize, Clone)]
pub struct LaunchStatusEvent {
    pub status: String,
    pub message: String,
}

#[tauri::command]
pub async fn launch_game(app: AppHandle, req: LaunchRequest) -> Result<(), String> {
    let client = reqwest::Client::new();
    let base_dir = dirs::data_dir()
        .ok_or_else(|| "Could not locate APPDATA directory".to_string())?
        .join("PannawatLauncher");

    let runtime_dir = base_dir.join("game_runtime");
    let profile_dir = base_dir.join("profiles").join(&req.profile_id);

    tokio::fs::create_dir_all(&runtime_dir)
        .await
        .map_err(|e| e.to_string())?;
    tokio::fs::create_dir_all(&profile_dir)
        .await
        .map_err(|e| e.to_string())?;

    // 1. Auth session
    let session = OfflineSession::new(&req.username);
    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "auth".into(),
            message: format!("Session established for {}", session.username),
        },
    );

    // 2. Ensure Java runtime
    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "java".into(),
            message: "Verifying Azul Zulu JRE 21...".into(),
        },
    );

    let app_clone = app.clone();
    let java_bin = ensure_java_runtime(&client, &runtime_dir, move |progress| {
        let _ = app_clone.emit("download-progress", progress);
    })
    .await
    .map_err(|e| format!("Java setup error: {:#}", e))?;

    // 3. Prepare Game environment (Libraries, Assets, Fabric)
    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "assets".into(),
            message: "Fetching Minecraft & Fabric assets and libraries...".into(),
        },
    );

    let app_clone2 = app.clone();
    let prepared = prepare_game_environment(
        &client,
        &runtime_dir,
        &req.mc_version,
        req.fabric_version.as_deref(),
        move |progress| {
            let _ = app_clone2.emit("download-progress", progress);
        },
    )
    .await
    .map_err(|e| format!("Game assets setup error: {:#}", e))?;

    // 4. Install standard performance mods if profile is new or requested
    let mods_dir = profile_dir.join("mods");
    tokio::fs::create_dir_all(&mods_dir)
        .await
        .map_err(|e| e.to_string())?;

    // 5. Build JVM config and spawn process
    let natives_dir = runtime_dir.join("natives").join(&req.mc_version);
    tokio::fs::create_dir_all(&natives_dir)
        .await
        .map_err(|e| e.to_string())?;

    let jvm_cfg = JvmConfig {
        java_path: java_bin,
        min_ram_mb: req.min_ram_mb.unwrap_or(1024),
        max_ram_mb: req.max_ram_mb.unwrap_or(4096),
        extra_flags: vec![],
        game_dir: profile_dir,
        version_id: req.mc_version,
        username: session.username,
        uuid: session.uuid,
        access_token: session.access_token,
        natives_dir,
        classpath: prepared.classpath,
        main_class: prepared.main_class,
        game_args: vec![
            "--assetIndex".into(),
            prepared.asset_index,
            "--assetsDir".into(),
            runtime_dir.join("assets").to_string_lossy().to_string(),
        ],
    };

    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "launching".into(),
            message: "Spawning Minecraft client with ZGC optimization...".into(),
        },
    );

    let mut child = spawn_game(&jvm_cfg)
        .await
        .map_err(|e| format!("Failed to spawn game process: {:#}", e))?;

    // Spawn async monitor to read output/detect crash
    tokio::spawn(async move {
        let status = child.wait().await;
        tracing::info!("Game process exited with: {:?}", status);
    });

    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "running".into(),
            message: "Minecraft is running.".into(),
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn kill_game(_app: AppHandle) -> Result<(), String> {
    Ok(())
}
