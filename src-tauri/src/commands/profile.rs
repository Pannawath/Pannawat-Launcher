use game_runtime::Profile;

#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>, String> {
    // TODO: read from %APPDATA%\PannawatLauncher\profiles\
    Ok(vec![])
}

#[tauri::command]
pub fn create_profile(name: String, mc_version: String) -> Result<Profile, String> {
    let base = dirs::data_dir()
        .ok_or("Cannot find data dir")?
        .join("PannawatLauncher");
    let profile = Profile::new(name, mc_version, base);
    // TODO: persist to JSON
    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(profile_id: String) -> Result<(), String> {
    // TODO: remove profile folder + JSON entry
    tracing::info!("Delete profile {profile_id}");
    Ok(())
}
