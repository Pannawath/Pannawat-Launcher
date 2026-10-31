use anyhow::Result;
use serde::Deserialize;

const FABRIC_META_BASE: &str = "https://meta.fabricmc.net/v2";

#[derive(Debug, Deserialize)]
pub struct FabricLoaderVersion {
    pub version: String,
    pub stable: bool,
}

/// Get available Fabric loader versions for a given MC version
pub async fn get_loader_versions(
    client: &reqwest::Client,
    mc_version: &str,
) -> Result<Vec<FabricLoaderVersion>> {
    let url = format!("{FABRIC_META_BASE}/versions/loader/{mc_version}");
    let items: Vec<serde_json::Value> = client.get(&url).send().await?.json().await?;
    let versions = items
        .into_iter()
        .filter_map(|v| {
            Some(FabricLoaderVersion {
                version: v["loader"]["version"].as_str()?.to_string(),
                stable: v["loader"]["stable"].as_bool().unwrap_or(false),
            })
        })
        .collect();
    Ok(versions)
}

/// Get the Fabric profile JSON (classpath + main class) for a version combination
pub async fn get_profile_json(
    client: &reqwest::Client,
    mc_version: &str,
    loader_version: &str,
) -> Result<serde_json::Value> {
    let url = format!(
        "{FABRIC_META_BASE}/versions/loader/{mc_version}/{loader_version}/profile/json"
    );
    let json = client.get(&url).send().await?.json().await?;
    Ok(json)
}
