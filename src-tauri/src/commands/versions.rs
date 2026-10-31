use game_runtime::manifest::{fetch_manifest, VersionEntry};

#[tauri::command]
pub async fn get_available_versions(include_snapshots: bool) -> Result<Vec<VersionEntry>, String> {
    let client = reqwest::Client::new();
    let manifest = fetch_manifest(&client).await.map_err(|e| e.to_string())?;

    let filtered = manifest
        .versions
        .into_iter()
        .filter(|v| {
            if include_snapshots {
                true
            } else {
                v.r#type == "release"
            }
        })
        .collect();

    Ok(filtered)
}
