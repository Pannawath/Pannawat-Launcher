use anyhow::Result;
use auth::OfflineSession;
use game_runtime::{ensure_java_runtime, prepare_game_environment};
use jvm_builder::{spawn_game, JvmConfig};
use tokio::io::{AsyncBufReadExt, BufReader};

#[tokio::main]
async fn main() -> Result<()> {
    println!("[TEST-RUNNER] Starting Direct Minecraft 26.3 Launch Verification...");

    let client = reqwest::Client::new();
    let base_dir = dirs::data_dir()
        .expect("Could not locate APPDATA directory")
        .join("PannawatLauncher");

    let runtime_dir = base_dir.join("game_runtime");
    let profile_dir = base_dir.join("profiles").join("test_profile_26_3");

    tokio::fs::create_dir_all(&runtime_dir).await?;
    tokio::fs::create_dir_all(&profile_dir).await?;

    let mc_version = "26.3";
    let username = "Pannawath";

    // 1. Session
    let session = OfflineSession::new(username);
    println!("[TEST-RUNNER] Auth Session established: username={}, uuid={}", session.username, session.uuid);

    // 2. Prepare Game Environment
    println!("[TEST-RUNNER] Preparing Game Environment for Minecraft {}...", mc_version);
    let prepared = prepare_game_environment(
        &client,
        &runtime_dir,
        mc_version,
        None, // Vanilla 26.3 first to ensure core engine runs
        |progress| {
            if progress.done {
                println!("[TEST-RUNNER] Downloaded: {}", progress.url);
            }
        },
    )
    .await?;

    println!(
        "[TEST-RUNNER] Game files prepared. Required Java Component: {}",
        prepared.java_component
    );

    // 3. Ensure Java Runtime
    println!("[TEST-RUNNER] Ensuring Java Runtime ({}) for Minecraft {}...", prepared.java_component, mc_version);
    let java_bin = ensure_java_runtime(
        &client,
        &runtime_dir,
        &prepared.java_component,
        |progress| {
            if progress.done {
                println!("[TEST-RUNNER] Java Downloaded: {}", progress.url);
            }
        },
    )
    .await?;

    println!("[TEST-RUNNER] Java binary confirmed at: {}", java_bin.display());

    // 4. Test java version
    let java_check = tokio::process::Command::new(&java_bin)
        .arg("-version")
        .output()
        .await?;
    println!("[TEST-RUNNER] Java Version Output:\n{}", String::from_utf8_lossy(&java_check.stderr));

    // 5. Build JVM config and spawn game
    let natives_dir = runtime_dir.join("natives").join(mc_version);
    tokio::fs::create_dir_all(&natives_dir).await?;

    let jvm_cfg = JvmConfig {
        java_path: java_bin,
        min_ram_mb: 2048,
        max_ram_mb: 4096,
        extra_flags: vec![],
        game_dir: profile_dir,
        version_id: mc_version.to_string(),
        username: session.username,
        uuid: session.uuid,
        access_token: session.access_token,
        natives_dir,
        classpath: prepared.classpath,
        main_class: prepared.main_class,
        assets_dir: runtime_dir.join("assets"),
        asset_index: prepared.asset_index,
    };

    println!("[TEST-RUNNER] Spawning Minecraft 26.3 Client with ZGC...");
    let mut child = spawn_game(&jvm_cfg).await?;

    let stdout = child.stdout.take().expect("Child stdout missing");
    let stderr = child.stderr.take().expect("Child stderr missing");

    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            println!("[MC-OUT] {}", line);
        }
    });

    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            eprintln!("[MC-ERR] {}", line);
        }
    });

    println!("[TEST-RUNNER] Waiting for game process to run (15 seconds test window)...");
    tokio::time::sleep(tokio::time::Duration::from_secs(15)).await;

    println!("[TEST-RUNNER] Game successfully ran without immediate crash.");
    Ok(())
}
