use auth::OfflineSession;
use game_runtime::{ensure_java_runtime, prepare_game_environment};
use jvm_builder::{spawn_game, JvmConfig};
use tauri::{AppHandle, Emitter};
use crate::commands::discord;

#[derive(serde::Deserialize)]
pub struct LaunchRequest {
    pub profile_id: String,
    pub profile_name: Option<String>,
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
            message: format!("Downloading Minecraft {} assets & libraries...", req.mc_version),
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
        version_id: req.mc_version.clone(),
        username: session.username,
        uuid: session.uuid,
        access_token: session.access_token,
        natives_dir,
        classpath: prepared.classpath,
        main_class: prepared.main_class,
        assets_dir: runtime_dir.join("assets"),
        asset_index: prepared.asset_index,
    };

    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "launching".into(),
            message: "Spawning Minecraft client with ZGC optimization...".into(),
        },
    );

    let p_name = req.profile_name.unwrap_or_else(|| "Default Profile".into());
    discord::update_presence_playing(&p_name, &req.mc_version);

    let mut child = spawn_game(&jvm_cfg)
        .await
        .map_err(|e| format!("Failed to spawn game process: {:#}", e))?;

    // Pipe stdout and stderr to capture crashes or errors
    if let Some(stdout) = child.stdout.take() {
        use tokio::io::{AsyncBufReadExt, BufReader};
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                println!("[MC-OUT] {}", line);
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        use tokio::io::{AsyncBufReadExt, BufReader};
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                eprintln!("[MC-ERR] {}", line);
            }
        });
    }

    tokio::spawn(async move {
        let status = child.wait().await;
        tracing::info!("Game process exited with: {:?}", status);
        discord::update_presence_idle();
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
