use mod_manager::InstalledMod;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchModsRequest {
    pub query: String,
    pub game_version: String,
    pub source: String, // "modrinth" | "curseforge" | "all"
    pub limit: u32,
}

fn get_profile_mods_dir(profile_id: &str) -> Result<PathBuf, String> {
    let base = dirs::data_dir()
        .ok_or_else(|| "Cannot find APPDATA directory".to_string())?
        .join("PannawatLauncher")
        .join("profiles")
        .join(profile_id)
        .join("mods");
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base)
}

#[tauri::command]
pub async fn search_mods(req: SearchModsRequest) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let results = mod_manager::modrinth::search(&client, &req.query, &req.game_version, req.limit)
        .await
        .map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(results).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn list_installed_mods(profile_id: String) -> Result<Vec<InstalledMod>, String> {
    let mods_dir = get_profile_mods_dir(&profile_id)?;
    let mut mods = Vec::new();

    if let Ok(entries) = fs::read_dir(mods_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let is_jar = ext == "jar";
                let is_disabled = ext == "disabled";
                if is_jar || is_disabled {
                    let filename = path.file_name().unwrap().to_string_lossy().to_string();
                    let name = filename.replace(".jar", "").replace(".disabled", "");
                    mods.push(InstalledMod {
                        id: name.clone(),
                        name,
                        version: "".into(),
                        source: mod_manager::ModSource::Local,
                        filename,
                        sha1: None,
                        enabled: is_jar,
                        icon_url: None,
                        dependencies: vec![],
                    });
                }
            }
        }
    }

    Ok(mods)
}

#[tauri::command]
pub async fn toggle_mod(profile_id: String, filename: String, enable: bool) -> Result<(), String> {
    let mods_dir = get_profile_mods_dir(&profile_id)?;
    let current_path = mods_dir.join(&filename);

    if enable && filename.ends_with(".disabled") {
        let new_name = filename.trim_end_matches(".disabled");
        fs::rename(current_path, mods_dir.join(new_name)).map_err(|e| e.to_string())?;
    } else if !enable && filename.ends_with(".jar") {
        let new_name = format!("{}.disabled", filename);
        fs::rename(current_path, mods_dir.join(new_name)).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn install_mod(
    profile_id: String,
    mod_id: String,
    game_version: String,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mods_dir = get_profile_mods_dir(&profile_id)?;

    mod_manager::install_modrinth_mod(&client, &mod_id, &game_version, &mods_dir, |_| {})
        .await
        .map_err(|e| format!("Mod installation error: {:#}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn install_mod_file_url(
    profile_id: String,
    download_url: String,
    filename: String,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mods_dir = get_profile_mods_dir(&profile_id)?;
    let dest = mods_dir.join(&filename);

    let res = client
        .get(&download_url)
        .header("User-Agent", "PannawatLauncher/0.1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status: {}", res.status()));
    }

    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    fs::write(dest, bytes).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_installed_mod(profile_id: String, filename: String) -> Result<(), String> {
    let mods_dir = get_profile_mods_dir(&profile_id)?;
    let target = mods_dir.join(&filename);
    if target.exists() {
        fs::remove_file(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}
