use auth::OfflineSession;

/// Create an offline session for the given username
#[tauri::command]
pub fn create_offline_session(username: String) -> Result<OfflineSession, String> {
    if username.trim().is_empty() {
        return Err("Username cannot be empty".into());
    }
    Ok(OfflineSession::new(username))
}
