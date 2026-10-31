use game_runtime::{export_profile_zip, import_profile_zip, Profile};
use std::fs;
use std::path::PathBuf;

fn get_profiles_dir() -> Result<PathBuf, String> {
    let base = dirs::data_dir()
        .ok_or_else(|| "Cannot find APPDATA directory".to_string())?
        .join("PannawatLauncher")
        .join("profiles");
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base)
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>, String> {
    let dir = get_profiles_dir()?;
    let mut profiles = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let config_path = entry.path().join("profile.json");
            if config_path.exists() {
                if let Ok(content) = fs::read_to_string(&config_path) {
                    if let Ok(profile) = serde_json::from_str::<Profile>(&content) {
                        profiles.push(profile);
                    }
                }
            }
        }
    }

    if profiles.is_empty() {
        let base_data = dirs::data_dir()
            .ok_or_else(|| "Cannot find APPDATA".to_string())?
            .join("PannawatLauncher");
        let default_profile = Profile::new("Default Profile", "1.21.4", base_data);
        let profile_dir = dir.join(&default_profile.id);
        fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
        let _ = fs::write(
            profile_dir.join("profile.json"),
            serde_json::to_string_pretty(&default_profile).unwrap(),
        );
        profiles.push(default_profile);
    }

    Ok(profiles)
}

#[tauri::command]
pub fn create_profile(
    name: String,
    mc_version: String,
    fabric_version: Option<String>,
) -> Result<Profile, String> {
    let dir = get_profiles_dir()?;
    let base_data = dirs::data_dir()
        .ok_or_else(|| "Cannot find APPDATA".to_string())?
        .join("PannawatLauncher");

    let mut profile = Profile::new(name, mc_version, base_data);
    profile.fabric_version = fabric_version;
    let profile_dir = dir.join(&profile.id);
    fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(profile_dir.join("mods")).map_err(|e| e.to_string())?;
    fs::write(
        profile_dir.join("profile.json"),
        serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    Ok(profile)
}

#[tauri::command]
pub fn open_instance_folder(profile_id: String) -> Result<(), String> {
    let dir = get_profiles_dir()?;
    let target = dir.join(&profile_id);
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_mods_folder(profile_id: String) -> Result<(), String> {
    let dir = get_profiles_dir()?;
    let target = dir.join(&profile_id).join("mods");
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct InstanceFileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub path: String,
}

#[tauri::command]
pub fn list_instance_files(profile_id: String, subpath: Option<String>) -> Result<Vec<InstanceFileEntry>, String> {
    let dir = get_profiles_dir()?;
    let mut target = dir.join(&profile_id);
    if let Some(sub) = subpath {
        let clean_sub = sub.trim_start_matches(|c| c == '/' || c == '\\');
        target = target.join(clean_sub);
    }
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    if let Ok(read_dir) = fs::read_dir(&target) {
        for entry in read_dir.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let rel_path = entry.path().strip_prefix(&dir.join(&profile_id))
                .unwrap_or(&entry.path())
                .to_string_lossy()
                .replace('\\', "/");
            entries.push(InstanceFileEntry {
                name,
                is_dir,
                size,
                path: rel_path,
            });
        }
    }
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name)));
    Ok(entries)
}

#[tauri::command]
pub fn delete_instance_file(profile_id: String, relative_path: String) -> Result<(), String> {
    let dir = get_profiles_dir()?;
    let clean = relative_path.trim_start_matches(|c| c == '/' || c == '\\');
    let target = dir.join(&profile_id).join(clean);
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())?;
    } else if target.is_file() {
        fs::remove_file(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_instance_logs(profile_id: String) -> Result<String, String> {
    let dir = get_profiles_dir()?;
    let log_path = dir.join(&profile_id).join("logs").join("latest.log");
    if log_path.exists() {
        fs::read_to_string(log_path).map_err(|e| e.to_string())
    } else {
        Ok(format!("[INFO] No log file created yet for profile: {}", profile_id))
    }
}

#[tauri::command]
pub fn delete_profile(profile_id: String) -> Result<(), String> {
    let dir = get_profiles_dir()?;
    let target = dir.join(&profile_id);
    if target.exists() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn export_profile(profile_id: String, output_path: String) -> Result<(), String> {
    let dir = get_profiles_dir()?;
    let profile_dir = dir.join(&profile_id);
    export_profile_zip(&profile_dir, &PathBuf::from(output_path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_profile(zip_path: String, profile_name: String, mc_version: String) -> Result<Profile, String> {
    let profile = create_profile(profile_name, mc_version, None)?;
    let dir = get_profiles_dir()?;
    let profile_dir = dir.join(&profile.id);
    import_profile_zip(&PathBuf::from(zip_path), &profile_dir).map_err(|e| e.to_string())?;
    Ok(profile)
}
