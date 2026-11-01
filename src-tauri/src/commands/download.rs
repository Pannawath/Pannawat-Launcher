#[tauri::command]
pub async fn check_java(_profile_id: String) -> Result<String, String> {
    // TODO: locate Azul Zulu JRE in data dir; return path or "not_found"
    Ok("not_found".into())
}

#[tauri::command]
pub async fn download_java(_app: tauri::AppHandle) -> Result<(), String> {
    // TODO: download Azul Zulu JRE for current arch, emit progress events
    tracing::info!("Downloading Azul Zulu JRE...");
    Ok(())
}
