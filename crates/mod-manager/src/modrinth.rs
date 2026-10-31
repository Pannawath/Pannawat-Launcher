use anyhow::Result;
use serde::{Deserialize, Serialize};

const MODRINTH_BASE: &str = "https://api.modrinth.com/v2";

#[derive(Debug, Deserialize)]
pub struct ModrinthSearchResult {
    pub hits: Vec<ModrinthMod>,
    pub total_hits: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ModrinthMod {
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub icon_url: Option<String>,
    pub downloads: u64,
    pub latest_version: Option<String>,
    pub versions: Vec<String>,
}

/// Search mods on Modrinth, filtered by game version and Fabric loader
pub async fn search(
    client: &reqwest::Client,
    query: &str,
    game_version: &str,
    limit: u32,
) -> Result<ModrinthSearchResult> {
    let facets = format!(
        r#"[["categories:fabric"],["versions:{game_version}"]]"#
    );
    let result = client
        .get(format!("{MODRINTH_BASE}/search"))
        .query(&[
            ("query", query),
            ("facets", &facets),
            ("limit", &limit.to_string()),
        ])
        .send()
        .await?
        .json::<ModrinthSearchResult>()
        .await?;
    Ok(result)
}

/// Get latest version file URL for a project + game version + fabric loader
pub async fn get_version_url(
    client: &reqwest::Client,
    project_id: &str,
    game_version: &str,
) -> Result<Option<String>> {
    let url = format!("{MODRINTH_BASE}/project/{project_id}/version");
    let versions: Vec<serde_json::Value> = client
        .get(&url)
        .query(&[
            ("game_versions", format!("[\"{game_version}\"]")),
            ("loaders", "[\"fabric\"]".to_string()),
        ])
        .send()
        .await?
        .json()
        .await?;

    let file_url = versions
        .first()
        .and_then(|v| v["files"].as_array())
        .and_then(|files| files.first())
        .and_then(|f| f["url"].as_str())
        .map(String::from);

    Ok(file_url)
}
