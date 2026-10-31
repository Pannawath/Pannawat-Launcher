use anyhow::Result;
use serde::{Deserialize, Serialize};

const MODRINTH_BASE: &str = "https://api.modrinth.com/v2";

#[derive(Debug, Deserialize, Serialize)]
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

/// Search mods on Modrinth, filtered by game version and Fabric loader, with automatic fallback
pub async fn search(
    client: &reqwest::Client,
    query: &str,
    game_version: &str,
    limit: u32,
) -> Result<ModrinthSearchResult> {
    let req_builder = client
        .get(format!("{MODRINTH_BASE}/search"))
        .header("User-Agent", "PannawatLauncher/0.1.0");

    let facets = if !game_version.is_empty() && game_version != "26.3" {
        format!(r#"[["categories:fabric"],["versions:{game_version}"]]"#)
    } else {
        r#"[["categories:fabric"]]"#.to_string()
    };

    let result = req_builder
        .query(&[
            ("query", query),
            ("facets", &facets),
            ("limit", &limit.to_string()),
        ])
        .send()
        .await?
        .json::<ModrinthSearchResult>()
        .await?;

    if result.hits.is_empty() && !game_version.is_empty() {
        // Fallback without version constraint
        let fallback_facets = r#"[["categories:fabric"]]"#;
        let fallback = client
            .get(format!("{MODRINTH_BASE}/search"))
            .header("User-Agent", "PannawatLauncher/0.1.0")
            .query(&[
                ("query", query),
                ("facets", fallback_facets),
                ("limit", &limit.to_string()),
            ])
            .send()
            .await?
            .json::<ModrinthSearchResult>()
            .await?;
        return Ok(fallback);
    }

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
        .header("User-Agent", "PannawatLauncher/0.1.0")
        .query(&[
            ("loaders", "[\"fabric\"]".to_string()),
        ])
        .send()
        .await?
        .json()
        .await?;

    // Try matching exact version first, or take latest fabric version
    let file_url = versions
        .iter()
        .find(|v| {
            v["game_versions"]
                .as_array()
                .map(|arr| arr.iter().any(|gv| gv.as_str() == Some(game_version)))
                .unwrap_or(false)
        })
        .or_else(|| versions.first())
        .and_then(|v| v["files"].as_array())
        .and_then(|files| files.first())
        .and_then(|f| f["url"].as_str())
        .map(String::from);

    Ok(file_url)
}
