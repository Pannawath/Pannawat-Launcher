use anyhow::Result;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;
use tracing::info;

/// JVM launch configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct JvmConfig {
    pub java_path: PathBuf,
    pub min_ram_mb: u32,
    pub max_ram_mb: u32,
    /// Extra custom flags appended by the user
    pub extra_flags: Vec<String>,
    pub game_dir: PathBuf,
    pub version_id: String,
    pub username: String,
    pub uuid: String,
    pub access_token: String,
    pub natives_dir: PathBuf,
    pub classpath: Vec<PathBuf>,
    pub main_class: String,
    pub game_args: Vec<String>,
}

/// Build the full JVM argument list
pub fn build_args(cfg: &JvmConfig) -> Vec<String> {
    let mut args: Vec<String> = vec![
        // GC — ZGC with generational mode (Java 21+)
        "-XX:+UseZGC".into(),
        "-XX:+ZGenerational".into(),
        "-XX:+AlwaysPreTouch".into(),
        "-XX:+DisableExplicitGC".into(),
        "-Xss1M".into(),
        format!("-Xms{}M", cfg.min_ram_mb),
        format!("-Xmx{}M", cfg.max_ram_mb),
        // Classpath
        "-cp".into(),
        cfg.classpath
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join(if cfg!(windows) { ";" } else { ":" }),
        // Natives
        format!(
            "-Djava.library.path={}",
            cfg.natives_dir.to_string_lossy()
        ),
    ];

    // User custom flags
    args.extend(cfg.extra_flags.iter().cloned());

    // Main class
    args.push(cfg.main_class.clone());

    // Game arguments
    args.extend(cfg.game_args.iter().cloned());

    args
}

/// Spawn the game process and return the child handle
pub async fn spawn_game(cfg: &JvmConfig) -> Result<tokio::process::Child> {
    let args = build_args(cfg);

    info!(
        "Launching: {} {}",
        cfg.java_path.display(),
        args.join(" ")
    );

    let child = Command::new(&cfg.java_path)
        .args(&args)
        .current_dir(&cfg.game_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    Ok(child)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_cfg() -> JvmConfig {
        JvmConfig {
            java_path: PathBuf::from("java"),
            min_ram_mb: 512,
            max_ram_mb: 4096,
            extra_flags: vec![],
            game_dir: PathBuf::from("."),
            version_id: "1.21.4".into(),
            username: "Pannawath".into(),
            uuid: "00000000-0000-0000-0000-000000000000".into(),
            access_token: "fake".into(),
            natives_dir: PathBuf::from("natives"),
            classpath: vec![PathBuf::from("minecraft.jar")],
            main_class: "net.minecraft.client.main.Main".into(),
            game_args: vec![],
        }
    }

    #[test]
    fn args_contain_zgc() {
        let args = build_args(&dummy_cfg());
        assert!(args.iter().any(|a| a == "-XX:+UseZGC"));
    }

    #[test]
    fn args_contain_ram() {
        let args = build_args(&dummy_cfg());
        assert!(args.iter().any(|a| a == "-Xmx4096M"));
        assert!(args.iter().any(|a| a == "-Xms512M"));
    }
}
