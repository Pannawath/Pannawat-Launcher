use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Emitter};
use tracing::info;

const GITHUB_REPO: &str = "Pannawath/Pannawat-Launcher";
const CURRENT_VERSION: &str = "0.2.0";

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub release_notes: String,
    pub download_url: Option<String>,
    pub published_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    #[allow(dead_code)]
    name: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    assets: Vec<GithubReleaseAsset>,
}

#[derive(Clone, Serialize)]
pub struct UpdateProgressPayload {
    pub stage: String, // "downloading" | "ready" | "error"
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: f64,
    pub message: String,
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    info!("Checking for launcher updates from GitHub repo: {}", GITHUB_REPO);
    let client = reqwest::Client::builder()
        .user_agent("Pannawat-Launcher-Updater")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!(
        "https://api.github.com/repos/{}/releases/latest",
        GITHUB_REPO
    );

    let res = client.get(&url).send().await.map_err(|e| {
        format!(
            "Cannot connect to GitHub release API (check internet connection): {}",
            e
        )
    })?;

    if res.status() == reqwest::StatusCode::NOT_FOUND {
        // No release created yet on repository
        return Ok(UpdateInfo {
            current_version: CURRENT_VERSION.to_string(),
            latest_version: CURRENT_VERSION.to_string(),
            has_update: false,
            release_notes: "You are currently running the latest build of Pannawat Launcher."
                .to_string(),
            download_url: None,
            published_at: None,
        });
    }

    if !res.status().is_success() {
        return Err(format!("GitHub API returned HTTP {}", res.status()));
    }

    let release: GithubRelease = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub release JSON: {}", e))?;

    let latest_tag = release.tag_name.trim_start_matches('v').to_string();
    let has_update = compare_versions(&latest_tag, CURRENT_VERSION);

    // Look for .exe asset
    let exe_asset = release.assets.into_iter().find(|a| {
        a.name.ends_with(".exe") || a.name.contains("pannawat-launcher")
    });

    let download_url = exe_asset.map(|a| a.browser_download_url);

    Ok(UpdateInfo {
        current_version: CURRENT_VERSION.to_string(),
        latest_version: latest_tag,
        has_update,
        release_notes: release
            .body
            .unwrap_or_else(|| "No changelog provided for this release.".to_string()),
        download_url,
        published_at: release.published_at,
    })
}

fn compare_versions(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.split('.')
            .filter_map(|s| s.chars().take_while(|c| c.is_ascii_digit()).collect::<String>().parse().ok())
            .collect()
    };

    let l = parse(latest);
    let c = parse(current);

    l > c
}

#[tauri::command]
pub async fn download_and_install_update(
    app: AppHandle,
    download_url: String,
) -> Result<String, String> {
    info!("Starting download of update from {}", download_url);

    let client = reqwest::Client::builder()
        .user_agent("Pannawat-Launcher-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download update file: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    let total_bytes = res.content_length().unwrap_or(0);
    let mut downloaded_bytes: u64 = 0;

    // Save update to a temp path
    let current_exe = env::current_exe().map_err(|e| format!("Cannot locate current exe: {}", e))?;
    let temp_dir = env::temp_dir();
    let new_exe_path = temp_dir.join("pannawat-launcher-update.exe");

    let mut stream = res.bytes_stream();
    use futures_util::StreamExt;
    let mut file = tokio::fs::File::create(&new_exe_path)
        .await
        .map_err(|e| format!("Cannot create temp file: {}", e))?;

    use tokio::io::AsyncWriteExt;

    while let Some(chunk_res) = stream.next().await {
        let chunk = chunk_res.map_err(|e| format!("Error during download stream: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Error writing chunk: {}", e))?;

        downloaded_bytes += chunk.len() as u64;
        let percent = if total_bytes > 0 {
            (downloaded_bytes as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        let _ = app.emit(
            "update_progress",
            UpdateProgressPayload {
                stage: "downloading".to_string(),
                downloaded_bytes,
                total_bytes,
                percent,
                message: format!(
                    "Downloading update: {:.1} MB / {:.1} MB ({:.0}%)",
                    downloaded_bytes as f64 / 1_048_576.0,
                    total_bytes as f64 / 1_048_576.0,
                    percent
                ),
            },
        );
    }

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush downloaded file: {}", e))?;

    let _ = app.emit(
        "update_progress",
        UpdateProgressPayload {
            stage: "ready".to_string(),
            downloaded_bytes,
            total_bytes,
            percent: 100.0,
            message: "Download complete. Restarting launcher to apply update...".to_string(),
        },
    );

    // Create an atomic replace batch script and execute it
    apply_update_and_restart(&current_exe, &new_exe_path)?;

    Ok("Update downloaded and updater script spawned. Restarting...".to_string())
}

fn apply_update_and_restart(current_exe: &PathBuf, new_exe: &PathBuf) -> Result<(), String> {
    let script_path = env::temp_dir().join("pannawat_updater.bat");
    let current_exe_str = current_exe.to_string_lossy().to_string();
    let new_exe_str = new_exe.to_string_lossy().to_string();

    // The batch script waits 1.5 seconds for the current process to close,
    // then copies the new exe over the current exe, and starts it!
    let batch_content = format!(
        r#"@echo off
timeout /t 2 /nobreak > nul
:retry
move /y "{new_exe}" "{current_exe}" > nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto retry
)
start "" "{current_exe}"
del "%~f0"
"#,
        new_exe = new_exe_str,
        current_exe = current_exe_str
    );

    fs::write(&script_path, batch_content)
        .map_err(|e| format!("Failed to create updater script: {}", e))?;

    // Spawn script in detached window
    Command::new("cmd")
        .args(["/C", &script_path.to_string_lossy()])
        .spawn()
        .map_err(|e| format!("Failed to spawn updater batch script: {}", e))?;

    // Exit current app so the file lock is released
    std::process::exit(0);
}
