use anyhow::Result;
use serde::{Deserialize, Serialize};

const VERSION_MANIFEST_URL: &str =
    "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";

#[derive(Debug, Deserialize)]
pub struct VersionManifest {
    pub latest: Latest,
    pub versions: Vec<VersionEntry>,
}

#[derive(Debug, Deserialize)]
pub struct Latest {
    pub release: String,
    pub snapshot: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct VersionEntry {
    pub id: String,
    pub r#type: String,
    pub url: String,
    pub time: String,
    #[serde(rename = "releaseTime")]
    pub release_time: String,
    pub sha1: String,
}

/// Fetch the Mojang version manifest
pub async fn fetch_manifest(client: &reqwest::Client) -> Result<VersionManifest> {
    let manifest = client
        .get(VERSION_MANIFEST_URL)
        .send()
        .await?
        .json::<VersionManifest>()
        .await?;
    Ok(manifest)
}

/// Fetch the full version JSON for a specific version
pub async fn fetch_version_json(
    client: &reqwest::Client,
    entry: &VersionEntry,
) -> Result<serde_json::Value> {
    let json = client.get(&entry.url).send().await?.json().await?;
    Ok(json)
}
