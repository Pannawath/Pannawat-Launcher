use anyhow::{Context, Result};
use sha1::{Digest, Sha1};
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tracing::{info, warn};

/// A single download task
#[derive(Debug, Clone)]
pub struct DownloadTask {
    pub url: String,
    pub dest: PathBuf,
    /// Expected SHA1 hash (hex string). None = skip verify.
    pub sha1: Option<String>,
    pub size: Option<u64>,
}

/// Progress event emitted per task
#[derive(Debug, Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub url: String,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub done: bool,
    pub error: Option<String>,
}

/// Verify a local file's SHA1 hash
pub async fn verify_sha1(path: &PathBuf, expected: &str) -> Result<bool> {
    let data = fs::read(path).await.context("read file for hash")?;
    let hash = hex::encode(Sha1::digest(&data));
    Ok(hash.eq_ignore_ascii_case(expected))
}

/// Check available disk space (cross-platform stub — Windows impl via winapi)
pub fn available_disk_bytes(path: &PathBuf) -> Result<u64> {
    // TODO: use windows::Win32::Storage::FileSystem::GetDiskFreeSpaceExW
    // Stub returning u64::MAX until platform impl added
    let _ = path;
    Ok(u64::MAX)
}

/// Download a single file with optional SHA1 verify.
/// Reports progress via `on_progress` callback.
pub async fn download_file(
    client: &reqwest::Client,
    task: &DownloadTask,
    on_progress: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<()> {
    use futures::StreamExt;

    // Skip if already present and hash matches
    if task.dest.exists() {
        if let Some(ref expected) = task.sha1 {
            if verify_sha1(&task.dest, expected).await.unwrap_or(false) {
                info!("Cache hit: {}", task.dest.display());
                on_progress(DownloadProgress {
                    url: task.url.clone(),
                    downloaded: task.size.unwrap_or(0),
                    total: task.size,
                    done: true,
                    error: None,
                });
                return Ok(());
            }
        }
    }

    // Create parent dirs
    if let Some(parent) = task.dest.parent() {
        fs::create_dir_all(parent).await.context("create dirs")?;
    }

    let resp = client.get(&task.url).send().await.context("GET request")?;
    let total = resp.content_length();
    let mut stream = resp.bytes_stream();

    let mut file = tokio::fs::File::create(&task.dest).await.context("create file")?;
    let mut downloaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("stream chunk")?;
        file.write_all(&chunk).await.context("write chunk")?;
        downloaded += chunk.len() as u64;
        on_progress(DownloadProgress {
            url: task.url.clone(),
            downloaded,
            total,
            done: false,
            error: None,
        });
    }
    file.flush().await?;

    // Post-download hash verify
    if let Some(ref expected) = task.sha1 {
        if !verify_sha1(&task.dest, expected).await? {
            warn!("Hash mismatch for {}", task.dest.display());
            return Err(anyhow::anyhow!("SHA1 mismatch: {}", task.url));
        }
    }

    on_progress(DownloadProgress {
        url: task.url.clone(),
        downloaded,
        total,
        done: true,
        error: None,
    });

    Ok(())
}

/// Download multiple files concurrently (up to `concurrency` at a time)
pub async fn download_batch(
    client: reqwest::Client,
    tasks: Vec<DownloadTask>,
    concurrency: usize,
    on_progress: impl Fn(DownloadProgress) + Send + Sync + Clone + 'static,
) -> Vec<Result<()>> {
    use futures::stream::{self, StreamExt};

    stream::iter(tasks)
        .map(|task| {
            let client = client.clone();
            let cb = on_progress.clone();
            async move { download_file(&client, &task, cb).await }
        })
        .buffer_unordered(concurrency)
        .collect()
        .await
}
