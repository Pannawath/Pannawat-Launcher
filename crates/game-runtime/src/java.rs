use anyhow::{Context, Result};
use downloader::{download_batch, find_java_binary, DownloadProgress, DownloadTask};
use serde_json::Value;
use std::path::{Path, PathBuf};
use tracing::info;

const MOJANG_ALL_JAVA_MANIFEST: &str =
    "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";

/// Ensures the correct Java Runtime for the specified version (e.g. Java 25 for Minecraft 26.3)
pub async fn ensure_java_runtime(
    client: &reqwest::Client,
    runtime_dir: &Path,
    java_component: &str, // e.g. "java-runtime-epsilon" (Java 25) or fallback to Zulu
    on_progress: impl Fn(DownloadProgress) + Send + Sync + Clone + 'static,
) -> Result<PathBuf> {
    let java_target_dir = runtime_dir.join("java").join(java_component);

    // 1. Check if already installed
    if java_target_dir.exists() {
        if let Some(bin) = find_java_binary(&java_target_dir) {
            info!("Existing JRE ({}) found at: {}", java_component, bin.display());
            return Ok(bin);
        }
    }

    info!("Resolving Mojang official runtime component: {}", java_component);

    // 2. Fetch Mojang All Java Manifest
    let all_json: Value = client
        .get(MOJANG_ALL_JAVA_MANIFEST)
        .send()
        .await?
        .json()
        .await?;

    let os_key = if cfg!(windows) { "windows-x64" } else { "linux" };
    let comp_manifest_url = all_json[os_key][java_component][0]["manifest"]["url"]
        .as_str()
        .context(format!("Could not find manifest for {}", java_component))?;

    // 3. Fetch component manifest containing all files
    let comp_json: Value = client
        .get(comp_manifest_url)
        .send()
        .await?
        .json()
        .await?;

    let files = comp_json["files"]
        .as_object()
        .context("Missing files in java manifest")?;

    let mut download_tasks = Vec::new();

    for (rel_path, info) in files {
        let f_type = info["type"].as_str().unwrap_or("file");
        let dest = java_target_dir.join(rel_path.replace('/', "\\"));

        if f_type == "directory" {
            tokio::fs::create_dir_all(&dest).await?;
        } else if let Some(raw) = info["downloads"]["raw"].as_object() {
            let url = raw["url"].as_str().unwrap().to_string();
            let sha1 = raw["sha1"].as_str().map(String::from);
            let size = raw["size"].as_u64();

            download_tasks.push(DownloadTask {
                url,
                dest,
                sha1,
                size,
            });
        }
    }

    info!(
        "Downloading official {} files ({} tasks)...",
        java_component,
        download_tasks.len()
    );
    download_batch(client.clone(), download_tasks, 16, on_progress).await;

    // 4. Locate binary
    find_java_binary(&java_target_dir)
        .context(format!("Could not find java executable for {}", java_component))
}
