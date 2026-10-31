mod commands;

use commands::{auth, discord, download, launch, mods, profile};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Start Discord RPC listener in background
    discord::init_discord_rpc();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Auth
            auth::create_offline_session,
            // Profiles & Modpacks
            profile::list_profiles,
            profile::create_profile,
            profile::delete_profile,
            profile::export_profile,
            profile::import_profile,
            // Launch
            launch::launch_game,
            launch::kill_game,
            // Mods
            mods::search_mods,
            mods::list_installed_mods,
            mods::toggle_mod,
            mods::install_mod,
            // Download / Java
            download::check_java,
            download::download_java,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pannawat Launcher");
}
