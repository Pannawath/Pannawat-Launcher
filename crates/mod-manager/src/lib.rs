use anyhow::Result;
use downloader::{download_file, DownloadProgress, DownloadTask};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tracing::info;

pub mod curseforge;
pub mod modrinth;
pub mod resolver;

/// A mod entry stored in a profile's mod list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledMod {
    pub id: String,
    pub name: String,
    pub version: String,
    pub source: ModSource,
    pub filename: String,
    pub sha1: Option<String>,
    pub enabled: bool,
    pub icon_url: Option<String>,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModSource {
    Modrinth,
    CurseForge,
    Local,
}

/// Dependency conflict detected between two mods
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModConflict {
    pub mod_id: String,
    pub conflicts_with: String,
    pub reason: String,
}

/// Default standard performance mods recommended in the architecture specification
pub const DEFAULT_PERFORMANCE_SLUGS: &[&str] = &[
    "fabric-api",
    "sodium",
    "lithium",
    "ferrite-core",
    "immediatelyfast",
];

/// Automatically downloads a mod by project slug or id from Modrinth into `mods_dir`
pub async fn install_modrinth_mod(
    client: &reqwest::Client,
    project_id: &str,
    game_version: &str,
    mods_dir: &Path,
    on_progress: impl Fn(DownloadProgress) + Send + 'static,
) -> Result<Option<InstalledMod>> {
    if let Some(download_url) =
        modrinth::get_version_url(client, project_id, game_version).await?
    {
        let filename = download_url
            .split('/')
            .last()
            .unwrap_or("mod.jar")
            .to_string();
        let dest = mods_dir.join(&filename);

        info!(
            "Downloading mod [{}] from {} into {}",
            project_id,
            download_url,
            dest.display()
        );

        let task = DownloadTask {
            url: download_url,
            dest,
            sha1: None,
            size: None,
        };

        download_file(client, &task, on_progress).await?;

        Ok(Some(InstalledMod {
            id: project_id.to_string(),
            name: project_id.to_string(),
            version: game_version.to_string(),
            source: ModSource::Modrinth,
            filename,
            sha1: None,
            enabled: true,
            icon_url: None,
            dependencies: vec![],
        }))
    } else {
        Ok(None)
    }
}
