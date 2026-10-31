mod commands;

use commands::{auth, discord, download, games, launch, mods, profile, versions};

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[LAUNCHER-LOG] Initializing Pannawat Launcher...");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            println!("[LAUNCHER-LOG] Tauri setup hook executed successfully.");
            
            // Initialize Discord Rich Presence in background thread
            discord::init_discord_rpc();

            for (label, window) in app.webview_windows() {
                println!("[LAUNCHER-LOG] Found window: {}", label);
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            auth::create_offline_session,
            // Discord RPC
            discord::set_discord_presence,
            // Versions
            versions::get_available_versions,
            // Profiles & Modpacks
            profile::list_profiles,
            profile::create_profile,
            profile::delete_profile,
            profile::export_profile,
            profile::import_profile,
            profile::open_instance_folder,
            profile::open_mods_folder,
            // Launch
            launch::launch_game,
            launch::kill_game,
            // Universal Games
            games::get_installed_games,
            games::pick_custom_game,
            games::remove_custom_game,
            games::launch_universal_game,
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
