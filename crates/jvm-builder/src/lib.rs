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

    // Check if the user specified their own GC collector (e.g., -XX:+UseG1GC, -XX:+UseParallelGC, etc.)
    let has_custom_gc = cfg
        .extra_flags
        .iter()
        .any(|flag| flag.contains("UseG1GC") || flag.contains("UseZGC") || flag.contains("UseParallelGC") || flag.contains("UseSerialGC") || flag.contains("UseShenandoahGC"));

    if !has_custom_gc {
        args.push("-XX:+UseG1GC".into());
    }

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

    // User extra custom flags
    args.extend(cfg.extra_flags.iter().cloned());

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
