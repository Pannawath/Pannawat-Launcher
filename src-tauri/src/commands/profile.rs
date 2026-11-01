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

fn validate_profile_id(profile_id: &str) -> Result<(), String> {
    if profile_id.is_empty()
        || profile_id == "."
        || profile_id == ".."
        || profile_id.contains('/')
        || profile_id.contains('\\')
        || profile_id.contains(':')
    {
        return Err("Invalid profile ID.".into());
    }
    Ok(())
}

fn instance_path(profile_id: &str, relative: Option<&str>) -> Result<(PathBuf, PathBuf), String> {
    validate_profile_id(profile_id)?;
    let root = get_profiles_dir()?.join(profile_id);
    let target = if let Some(relative) = relative {
        let rel = PathBuf::from(relative);
        if rel.is_absolute() || rel.components().any(|part| !matches!(part, std::path::Component::Normal(_))) {
            return Err("Invalid instance path.".into());
        }
        root.join(rel)
    } else {
        root.clone()
    };
    Ok((root, target))
}

fn require_instance(profile_id: &str) -> Result<PathBuf, String> {
    validate_profile_id(profile_id)?;
    let root = get_profiles_dir()?.join(profile_id);
    if !root.is_dir() {
        return Err("Profile does not exist.".into());
    }
    Ok(root)
}

fn ensure_no_symlink_path(root: &PathBuf, target: &PathBuf, allow_missing_leaf: bool) -> Result<(), String> {
    let mut current = root.clone();
    let relative = target.strip_prefix(root).map_err(|_| "Invalid instance path.".to_string())?;
    let components: Vec<_> = relative.components().collect();
    for (index, component) in components.iter().enumerate() {
        current.push(component.as_os_str());
        match fs::symlink_metadata(&current) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err("Symbolic links are not allowed in instance file operations.".into());
            }
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound
                && allow_missing_leaf
                && index + 1 == components.len() => {}
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(())
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
pub fn update_profile(profile: Profile) -> Result<Profile, String> {
    validate_profile_id(&profile.id)?;
    let dir = get_profiles_dir()?;
    let profile_dir = dir.join(&profile.id);
    if !profile_dir.is_dir() {
        return Err("Profile does not exist.".into());
    }
    fs::write(
        profile_dir.join("profile.json"),
        serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
pub fn open_instance_folder(profile_id: String) -> Result<(), String> {
    let target = require_instance(&profile_id)?;
    
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
    let target = require_instance(&profile_id)?.join("mods");
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
    let (root, target) = instance_path(&profile_id, subpath.as_deref())?;
    ensure_no_symlink_path(&root, &target, false)?;
    if !target.is_dir() {
        return Err("Folder does not exist in this instance.".into());
    }

    let mut entries = Vec::new();
    if let Ok(read_dir) = fs::read_dir(&target) {
        for entry in read_dir.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let rel_path = entry.path().strip_prefix(&root)
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
    let (root, target) = instance_path(&profile_id, Some(&relative_path))?;
    ensure_no_symlink_path(&root, &target, false)?;
    if target == root {
        return Err("Cannot delete the entire instance directory.".into());
    }
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())?;
    } else if target.is_file() {
        fs::remove_file(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_instance_logs(profile_id: String) -> Result<String, String> {
    let root = require_instance(&profile_id)?;
    let log_path = root.join("logs").join("latest.log");
    ensure_no_symlink_path(&root, &log_path, true)?;
    if log_path.exists() {
        fs::read_to_string(log_path).map_err(|e| e.to_string())
    } else {
        Ok(format!("[INFO] No log file created yet for profile: {}", profile_id))
    }
}

#[tauri::command]
pub fn delete_profile(profile_id: String) -> Result<(), String> {
    let target = require_instance(&profile_id)?;
    if target.exists() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn export_profile(profile_id: String, output_path: String) -> Result<(), String> {
    let profile_dir = require_instance(&profile_id)?;
    export_profile_zip(&profile_dir, &PathBuf::from(output_path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_profile(zip_path: String, profile_name: String, mc_version: String) -> Result<Profile, String> {
    let archive = PathBuf::from(&zip_path);
    if !archive.is_file() {
        return Err("Selected archive does not exist.".into());
    }
    let profile = create_profile(profile_name, mc_version, None)?;
    let dir = get_profiles_dir()?;
    let profile_dir = dir.join(&profile.id);
    if let Err(error) = import_profile_zip(&archive, &profile_dir) {
        let _ = fs::remove_dir_all(&profile_dir);
        return Err(error.to_string());
    }
    Ok(profile)
}
