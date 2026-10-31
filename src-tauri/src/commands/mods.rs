use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchModsRequest {
    pub query: String,
    pub game_version: String,
    pub source: String, // "modrinth" | "curseforge" | "all"
    pub limit: u32,
}

#[tauri::command]
pub async fn search_mods(req: SearchModsRequest) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    match req.source.as_str() {
        "modrinth" => {
            let results =
                mod_manager::modrinth::search(&client, &req.query, &req.game_version, req.limit)
                    .await
                    .map_err(|e| e.to_string())?;
            Ok(serde_json::to_value(results).unwrap())
        }
        _ => Err("Source not supported yet".into()),
    }
}

#[tauri::command]
pub async fn install_mod(
    profile_id: String,
    mod_id: String,
    game_version: String,
) -> Result<(), String> {
    // TODO: download mod jar into profile mods folder
    tracing::info!("Install mod {mod_id} for profile {profile_id} @ {game_version}");
    Ok(())
}
