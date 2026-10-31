use game_runtime::manifest::{fetch_manifest, VersionEntry};

#[tauri::command]
pub async fn get_available_versions(include_snapshots: Option<bool>) -> Result<Vec<VersionEntry>, String> {
    let client = reqwest::Client::new();
    let manifest = fetch_manifest(&client).await.map_err(|e| e.to_string())?;

    let allow_snap = include_snapshots.unwrap_or(true);
    let filtered = manifest
        .versions
        .into_iter()
        .filter(|v| {
            if allow_snap {
                true
            } else {
                v.r#type == "release"
            }
        })
        .collect();

    Ok(filtered)
}
