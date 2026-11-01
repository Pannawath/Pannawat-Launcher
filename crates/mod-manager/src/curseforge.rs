/// CurseForge API integration
/// Requires CF_API_KEY environment variable
use anyhow::Result;
use serde::{Deserialize, Serialize};

const CF_BASE: &str = "https://api.curseforge.com/v1";
const MC_GAME_ID: u32 = 432;

fn api_key() -> Result<String> {
    std::env::var("CF_API_KEY").map_err(|_| anyhow::anyhow!("CF_API_KEY not set"))
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CfMod {
    pub id: u64,
    pub name: String,
    pub summary: String,
    pub logo: Option<CfLogo>,
    pub download_count: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CfLogo {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct CfSearchResult {
    pub data: Vec<CfMod>,
}

pub async fn search(
    client: &reqwest::Client,
    query: &str,
    game_version: &str,
    limit: u32,
) -> Result<CfSearchResult> {
    let key = api_key()?;
    let result = client
        .get(format!("{CF_BASE}/mods/search"))
        .header("x-api-key", key)
        .query(&[
            ("gameId", MC_GAME_ID.to_string()),
            ("searchFilter", query.to_string()),
            ("gameVersion", game_version.to_string()),
            ("modLoaderType", "4".to_string()), // 4 = Fabric
            ("pageSize", limit.to_string()),
        ])
        .send()
        .await?
        .json::<CfSearchResult>()
        .await?;
    Ok(result)
}
