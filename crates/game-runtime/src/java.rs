use anyhow::{Context, Result};
use downloader::{download_file, extract_zip, find_java_binary, DownloadProgress, DownloadTask};
use std::path::{Path, PathBuf};
use tracing::info;

/// Azul Zulu OpenJDK 21 LTS Community release for Windows x64
const ZULU_21_WIN_X64_ZIP: &str =
    "https://cdn.azul.com/zulu/bin/zulu21.38.21-ca-jre21.0.5-win_x64.zip";

/// Resolves or automatically downloads and unpacks Azul Zulu JRE 21 LTS
pub async fn ensure_java_runtime(
    client: &reqwest::Client,
    runtime_dir: &Path,
    on_progress: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<PathBuf> {
    let java_base_dir = runtime_dir.join("java").join("zulu-21");

    // 1. Check if an extracted java binary already exists
    if java_base_dir.exists() {
        if let Some(bin) = find_java_binary(&java_base_dir) {
            info!("Existing JRE found at: {}", bin.display());
            return Ok(bin);
        }
    }

    // 2. Download JRE zip if needed
    let zip_dest = runtime_dir.join("java").join("zulu-21.zip");
    let task = DownloadTask {
        url: ZULU_21_WIN_X64_ZIP.to_string(),
        dest: zip_dest.clone(),
        sha1: None,
        size: None,
    };

    info!("Downloading Azul Zulu JRE 21 from: {}", task.url);
    download_file(client, &task, on_progress).await?;

    // 3. Extract JRE
    info!("Extracting JRE into {}", java_base_dir.display());
    extract_zip(&zip_dest, &java_base_dir).context("Extract JRE zip")?;

    // 4. Locate binary
    find_java_binary(&java_base_dir)
        .context("Could not find java executable after unpacking Zulu JRE archive")
}
