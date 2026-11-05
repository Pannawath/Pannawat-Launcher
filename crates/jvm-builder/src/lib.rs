use anyhow::Result;
use std::path::PathBuf;
use tokio::process::Command;
use tracing::info;

/// JVM launch configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct JvmConfig {
    pub java_path: PathBuf,
    pub min_ram_mb: u32,
    pub max_ram_mb: u32,
    pub extra_flags: Vec<String>,
    pub game_dir: PathBuf,
    pub version_id: String,
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub natives_dir: PathBuf,
    pub classpath: Vec<PathBuf>,
    pub main_class: String,
    pub assets_dir: PathBuf,
    pub asset_index: String,
}

/// Build the full JVM argument list for modern Minecraft
pub fn build_args(cfg: &JvmConfig) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    // Sanitize user extra flags to ensure no duplicate GC collectors, heap size conflicts, or obsolete options
    let mut sanitized_user_flags: Vec<String> = Vec::new();
    let mut user_selected_gc: Option<String> = None;

    for flag in &cfg.extra_flags {
        let trimmed = flag.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Detect GC selector
        if trimmed.contains("UseZGC") {
            user_selected_gc = Some("-XX:+UseZGC".to_string());
            continue;
        } else if trimmed.contains("UseG1GC") {
            user_selected_gc = Some("-XX:+UseG1GC".to_string());
            continue;
        } else if trimmed.contains("UseParallelGC") {
            user_selected_gc = Some("-XX:+UseParallelGC".to_string());
            continue;
        } else if trimmed.contains("UseSerialGC") {
            user_selected_gc = Some("-XX:+UseSerialGC".to_string());
            continue;
        } else if trimmed.contains("UseShenandoahGC") {
            user_selected_gc = Some("-XX:+UseShenandoahGC".to_string());
            continue;
        }

        // Skip obsolete/removed flags that cause JVM warnings or aborts in modern Java 24/25
        if trimmed.contains("ZGenerational") {
            continue;
        }

        // Skip conflicting heap definitions if already specified via min_ram_mb/max_ram_mb
        if trimmed.starts_with("-Xms") || trimmed.starts_with("-Xmx") || trimmed.starts_with("-Xss") {
            continue;
        }

        // Avoid duplicate common performance flags
        if trimmed == "-XX:+AlwaysPreTouch" || trimmed == "-XX:+DisableExplicitGC" {
            continue;
        }

        sanitized_user_flags.push(trimmed.to_string());
    }

    // Exactly ONE GC collector must be used
    let chosen_gc = user_selected_gc.unwrap_or_else(|| "-XX:+UseG1GC".to_string());
    args.push(chosen_gc);

    // Default performance flags
    args.push("-XX:+AlwaysPreTouch".into());
    args.push("-XX:+DisableExplicitGC".into());
    args.push("-Xss1M".into());
    args.push(format!("-Xms{}M", cfg.min_ram_mb));
    args.push(format!("-Xmx{}M", cfg.max_ram_mb));

    // Modern Java modules access
    args.push("--enable-native-access=ALL-UNNAMED".into());
    args.push("--add-exports=java.base/jdk.internal.misc=ALL-UNNAMED".into());

    // Natives & Shared libs
    args.push(format!(
        "-Djava.library.path={}",
        cfg.natives_dir.to_string_lossy()
    ));
    args.push(format!(
        "-Dorg.lwjgl.system.SharedLibraryExtractPath={}",
        cfg.natives_dir.to_string_lossy()
    ));
    args.push(format!(
        "-Dio.netty.native.workdir={}",
        cfg.natives_dir.to_string_lossy()
    ));
    args.push("-Dminecraft.launcher.brand=PannawatLauncher".into());
    args.push("-Dminecraft.launcher.version=1.0.0".into());

    // Classpath
    args.push("-cp".into());
    args.push(
        cfg.classpath
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join(if cfg!(windows) { ";" } else { ":" }),
    );

    // User extra custom flags (sanitized)
    args.extend(sanitized_user_flags);

    // Main class
    args.push(cfg.main_class.clone());

    // Minecraft Game Arguments (standard modern spec)
    args.extend(vec![
        "--username".into(),
        cfg.username.clone(),
        "--version".into(),
        cfg.version_id.clone(),
        "--gameDir".into(),
        cfg.game_dir.to_string_lossy().to_string(),
        "--assetsDir".into(),
        cfg.assets_dir.to_string_lossy().to_string(),
        "--assetIndex".into(),
        cfg.asset_index.clone(),
        "--uuid".into(),
        cfg.uuid.clone(),
        "--accessToken".into(),
        cfg.access_token.clone(),
        "--clientId".into(),
        "PannawatClient".into(),
        "--xuid".into(),
        "0".into(),
        "--userType".into(),
        "mojang".into(),
        "--versionType".into(),
        "release".into(),
    ]);

    args
}

/// Spawn the game process and return the child handle
pub async fn spawn_game(cfg: &JvmConfig) -> Result<tokio::process::Child> {
    let args = build_args(cfg);

    info!(
        "Executing Java process: {} {}",
        cfg.java_path.display(),
        args.join(" ")
    );

    let child = Command::new(&cfg.java_path)
        .args(&args)
        .current_dir(&cfg.game_dir)
        // Keep pipes attached so the launcher can surface JVM failures instead of
        // silently returning to the ready state when the client exits early.
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()?;

    Ok(child)
}
