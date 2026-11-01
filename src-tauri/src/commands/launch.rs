use auth::OfflineSession;
use game_runtime::{ensure_java_runtime, prepare_game_environment};
use jvm_builder::{spawn_game, JvmConfig};
use tauri::{AppHandle, Emitter};
use crate::commands::discord;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use tokio::io::AsyncReadExt;

static ACTIVE_GAME_PID: AtomicU32 = AtomicU32::new(0);
static LAUNCH_CANCELLED: AtomicBool = AtomicBool::new(false);
static LAUNCH_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

#[derive(serde::Deserialize)]
pub struct LaunchRequest {
    pub profile_id: String,
    pub profile_name: Option<String>,
    pub username: String,
    pub mc_version: String,
    pub fabric_version: Option<String>,
    pub min_ram_mb: Option<u32>,
    pub max_ram_mb: Option<u32>,
    pub java_path: Option<String>,
    pub jvm_args: Option<String>,
}

#[derive(serde::Serialize, Clone)]
pub struct LaunchStatusEvent {
    pub status: String,
    pub message: String,
}

#[tauri::command]
pub async fn launch_game(app: AppHandle, req: LaunchRequest) -> Result<(), String> {
    if req.profile_id.is_empty()
        || req.profile_id == "."
        || req.profile_id == ".."
        || req.profile_id.contains('/')
        || req.profile_id.contains('\\')
        || req.profile_id.contains(':')
    {
        return Err("Invalid profile ID.".into());
    }
    if LAUNCH_IN_PROGRESS.swap(true, Ordering::SeqCst) {
        return Err("Minecraft is already starting or running.".into());
    }
    LAUNCH_CANCELLED.store(false, Ordering::SeqCst);
    let mut launch_guard = LaunchGuard { app: app.clone(), running: false };
    let client = reqwest::Client::new();
    let (min_ram_mb, max_ram_mb) = normalize_ram(req.min_ram_mb, req.max_ram_mb)?;
    let extra_flags = parse_jvm_args(req.jvm_args.as_deref().unwrap_or(""))?;
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

    // 2. Prepare Game environment (Libraries, Assets, Fabric, and identify Java runtime)
    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "assets".into(),
            message: format!("Downloading Minecraft {} assets & libraries...", req.mc_version),
        },
    );

    let app_clone = app.clone();
    let prepared = prepare_game_environment(
        &client,
        &runtime_dir,
        &req.mc_version,
        req.fabric_version.as_deref(),
        move |progress| {
            let _ = app_clone.emit("download-progress", progress);
        },
    )
    .await
    .map_err(|e| format!("Game assets setup error: {:#}", e))?;
    ensure_launch_not_cancelled()?;

    // 3. Ensure Java runtime
    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "java".into(),
            message: format!("Verifying Java Runtime ({}) for Minecraft {}...", prepared.java_component, req.mc_version),
        },
    );

    let app_clone2 = app.clone();
    let java_bin = if let Some(path) = req.java_path.as_deref().filter(|path| !path.trim().is_empty()) {
        let path = std::path::PathBuf::from(path);
        if !path.is_file() {
            return Err("Selected Java executable does not exist.".into());
        }
        path
    } else {
        ensure_java_runtime(
            &client,
            &runtime_dir,
            &prepared.java_component,
            move |progress| {
                let _ = app_clone2.emit("download-progress", progress);
            },
        )
        .await
        .map_err(|e| format!("Java setup error: {:#}", e))?
    };
    ensure_launch_not_cancelled()?;

    // 4. Install mods directory
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
        min_ram_mb,
        max_ram_mb,
        extra_flags,
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
            message: "Spawning Minecraft client...".into(),
        },
    );

    let p_name = req.profile_name.unwrap_or_else(|| "Default Profile".into());
    discord::update_presence_playing(&p_name, &req.mc_version);

    let mut child = spawn_game(&jvm_cfg)
        .await
        .map_err(|e| format!("Failed to spawn game process: {:#}", e))?;

    // Store PID for Force Out / kill_game
    if let Some(pid) = child.id() {
        ACTIVE_GAME_PID.store(pid, Ordering::SeqCst);
    }
    if let Err(error) = ensure_launch_not_cancelled() {
        if let Some(pid) = child.id() {
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/T", "/PID", &pid.to_string()])
                    .output();
            }
        }
        return Err(error);
    }

    let app_exit = app.clone();
    let mut stdout = child.stdout.take();
    let mut stderr = child.stderr.take();
    tokio::spawn(async move {
        let mut stdout_buf = Vec::new();
        let mut stderr_buf = Vec::new();
        // Drain both pipes concurrently; reading one to completion first can
        // deadlock a noisy JVM when the other pipe reaches its OS buffer limit.
        let stdout_read = async {
            if let Some(ref mut stream) = stdout {
                let _ = stream.read_to_end(&mut stdout_buf).await;
            }
        };
        let stderr_read = async {
            if let Some(ref mut stream) = stderr {
                let _ = stream.read_to_end(&mut stderr_buf).await;
            }
        };
        tokio::join!(stdout_read, stderr_read);
        let status = child.wait().await;
        tracing::info!("Game process exited with: {:?}", status);
        ACTIVE_GAME_PID.store(0, Ordering::SeqCst);
        discord::update_presence_idle();
        let diagnostic = String::from_utf8_lossy(&stderr_buf).trim().to_string();
        let _ = app_exit.emit(
            "launch-status",
            LaunchStatusEvent {
                status: "idle".into(),
                message: if diagnostic.is_empty() {
                    "Minecraft closed.".into()
                } else {
                    format!("Minecraft exited: {}", diagnostic.lines().last().unwrap_or(&diagnostic))
                },
            },
        );
    });

    let _ = app.emit(
        "launch-status",
        LaunchStatusEvent {
            status: "running".into(),
            message: "Minecraft is running.".into(),
        },
    );
    launch_guard.running = true;

    Ok(())
}

#[tauri::command]
pub async fn kill_game(app: AppHandle) -> Result<(), String> {
    let pid = ACTIVE_GAME_PID.load(Ordering::SeqCst);

    let starting = LAUNCH_IN_PROGRESS.load(Ordering::SeqCst);
    if pid == 0 && !starting {
        return Err("No Minecraft process is running.".into());
    }
    LAUNCH_CANCELLED.store(true, Ordering::SeqCst);

    if pid == 0 {
        let _ = app.emit(
            "launch-status",
            LaunchStatusEvent {
                status: "idle".into(),
                message: "Minecraft startup cancelled.".into(),
            },
        );
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .output()
            .map_err(|e| format!("Could not run taskkill: {e}"))?;
        if !output.status.success() {
            let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(if detail.is_empty() { "Could not terminate Minecraft process.".into() } else { detail });
        }
        let _ = app.emit(
            "launch-status",
            LaunchStatusEvent {
                status: "idle".into(),
                message: "Minecraft process terminated.".into(),
            },
        );
    }

    #[cfg(not(target_os = "windows"))]
    {
        return Err("Force Out is currently supported on Windows only.".into());
    }

    if pid > 0 {
        ACTIVE_GAME_PID.store(0, Ordering::SeqCst);
    }

    Ok(())
}

struct LaunchGuard {
    app: AppHandle,
    running: bool,
}

impl Drop for LaunchGuard {
    fn drop(&mut self) {
        LAUNCH_IN_PROGRESS.store(false, Ordering::SeqCst);
        if !self.running && ACTIVE_GAME_PID.load(Ordering::SeqCst) == 0 {
            let _ = self.app.emit(
                "launch-status",
                LaunchStatusEvent {
                    status: "idle".into(),
                    message: if LAUNCH_CANCELLED.load(Ordering::SeqCst) {
                        "Minecraft startup cancelled.".into()
                    } else {
                        "Minecraft startup failed.".into()
                    },
                },
            );
        }
    }
}

fn ensure_launch_not_cancelled() -> Result<(), String> {
    if LAUNCH_CANCELLED.load(Ordering::SeqCst) {
        Err("Minecraft startup was cancelled.".into())
    } else {
        Ok(())
    }
}

fn normalize_ram(minimum: Option<u32>, maximum: Option<u32>) -> Result<(u32, u32), String> {
    let maximum = maximum.unwrap_or(4096).clamp(1024, 65536);
    let minimum = minimum.unwrap_or(1024).clamp(512, maximum);
    Ok((minimum, maximum))
}

fn parse_jvm_args(input: &str) -> Result<Vec<String>, String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut quote = None;
    let mut escaped = false;
    for character in input.chars() {
        if escaped {
            current.push(character);
            escaped = false;
        } else if character == '\\' && quote.is_some() {
            escaped = true;
        } else if Some(character) == quote {
            quote = None;
        } else if quote.is_none() && (character == '\'' || character == '"') {
            quote = Some(character);
        } else if quote.is_none() && character.is_whitespace() {
            if !current.is_empty() {
                args.push(std::mem::take(&mut current));
            }
        } else {
            current.push(character);
        }
    }
    if quote.is_some() {
        return Err("JVM arguments contain an unmatched quote.".into());
    }
    if escaped {
        current.push('\\');
    }
    if !current.is_empty() {
        args.push(current);
    }
    if args.iter().any(|arg| arg.starts_with("-cp") || arg == "-classpath" || arg.starts_with("--gameDir")) {
        return Err("JVM arguments cannot override launcher-owned classpath or game directory settings.".into());
    }
    Ok(args)
}
