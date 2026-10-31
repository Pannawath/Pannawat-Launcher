use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledGame {
    pub id: String,
    pub name: String,
    pub platform: String, // "minecraft", "steam", "roblox", "epic", "custom"
    pub banner_url: String,
    pub icon_url: String,
    pub description: String,
    pub launch_target: String, // steam appid, executable path, or minecraft id
    pub is_running: bool,
    pub tag: String, // "Most Played", "Recently Played", "Installed"
}

#[tauri::command]
pub async fn get_installed_games() -> Result<Vec<InstalledGame>, String> {
    let mut games = Vec::new();

    // 1. Minecraft Java Edition (Always present on this launcher)
    games.push(InstalledGame {
        id: "minecraft".into(),
        name: "Minecraft: Java Edition".into(),
        platform: "minecraft".into(),
        banner_url: "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=1920&q=80".into(),
        icon_url: "https://cdn.iconscout.com/icon/free/png-256/free-minecraft-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-2795415.png".into(),
        description: "Explore infinite blocky worlds, craft tools, build majestic structures, and battle monsters. Featuring official version 26.3, Microsoft Java 25 LTS, and ultra-low latency ZGC optimization.".into(),
        launch_target: "26.3".into(),
        is_running: false,
        tag: "Most Played".into(),
    });

    // 2. Scan Roblox
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let roblox_dir = PathBuf::from(&local_app_data).join("Roblox");
    if roblox_dir.exists() {
        games.push(InstalledGame {
            id: "roblox".into(),
            name: "Roblox".into(),
            platform: "roblox".into(),
            banner_url: "https://images.unsplash.com/photo-1612287233207-6f8d3870624a?auto=format&fit=crop&w=1920&q=80".into(),
            icon_url: "https://cdn.iconscout.com/icon/free/png-256/free-roblox-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-2795431.png".into(),
            description: "Roblox is an online game platform and game creation system that allows users to program games and play games created by other users.".into(),
            launch_target: "roblox://".into(),
            is_running: false,
            tag: "Trending".into(),
        });
    }

    // 3. Scan Steam Libraries (D:\SteamLibrary and C:\Program Files (x86)\Steam)
    let steam_paths = vec![
        PathBuf::from(r"D:\SteamLibrary\steamapps"),
        PathBuf::from(r"C:\Program Files (x86)\Steam\steamapps"),
    ];

    for steam_dir in steam_paths {
        if let Ok(entries) = std::fs::read_dir(&steam_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(file_name) = path.file_name().and_then(|f| f.to_str()) {
                    if file_name.starts_with("appmanifest_") && file_name.ends_with(".acf") {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            let mut name = String::new();
                            let mut appid = String::new();

                            for line in content.lines() {
                                let trimmed = line.trim();
                                if trimmed.starts_with("\"name\"") {
                                    if let Some(val) = extract_vdf_value(trimmed) {
                                        name = val.to_string();
                                    }
                                } else if trimmed.starts_with("\"appid\"") {
                                    if let Some(val) = extract_vdf_value(trimmed) {
                                        appid = val.to_string();
                                    }
                                }
                            }

                            if !name.is_empty() && !appid.is_empty() && !name.contains("Redistributable") && !name.contains("Steamworks") {
                                let (banner, description, tag) = match appid.as_str() {
                                    "1574820" => (
                                        "https://cdn.cloudflare.steamstatic.com/steam/apps/1574820/library_hero.jpg".to_string(),
                                        "A fateful meeting sets off a chain reaction, upending Mark's life. People disappear and memories prove unreliable. Uncover a hidden truth with Mark and his friends in this narrative adventure.".to_string(),
                                        "Most Recent".to_string(),
                                    ),
                                    "244210" => (
                                        "https://cdn.cloudflare.steamstatic.com/steam/apps/244210/library_hero.jpg".to_string(),
                                        "Assetto Corsa features an advanced DirectX 11 graphics engine that recreates an immersive environment, dynamic lighting, and realistic materials and surfaces.".to_string(),
                                        "Promoted".to_string(),
                                    ),
                                    "4162040" => (
                                        "https://cdn.cloudflare.steamstatic.com/steam/apps/4162040/library_hero.jpg".to_string(),
                                        "Zenless Zone Zero is a 3D Action RPG game developed by HoYoverse, set in a post-apocalyptic world with dynamic combat and dual-identity urban fantasy.".to_string(),
                                        "Trending".to_string(),
                                    ),
                                    _ => (
                                        format!("https://cdn.cloudflare.steamstatic.com/steam/apps/{}/header.jpg", appid),
                                        format!("Play {} directly from your personal game library.", name),
                                        "Installed".to_string(),
                                    ),
                                };

                                let icon = format!(
                                    "https://cdn.cloudflare.steamstatic.com/steam/apps/{}/capsule_184x69.jpg",
                                    appid
                                );

                                games.push(InstalledGame {
                                    id: format!("steam-{}", appid),
                                    name,
                                    platform: "steam".into(),
                                    banner_url: banner,
                                    icon_url: icon,
                                    description,
                                    launch_target: format!("steam://run/{}", appid),
                                    is_running: false,
                                    tag,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Scan Epic Games (e.g. Arknights: Endfield)
    let epic_dir = PathBuf::from(r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests");
    if epic_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&epic_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("item") {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                            if let (Some(display_name), Some(app_name)) = (val["DisplayName"].as_str(), val["AppName"].as_str()) {
                                // Exclude editor plugins
                                if !display_name.contains("Plugin") && !display_name.contains("Bridge") {
                                    games.push(InstalledGame {
                                        id: format!("epic-{}", app_name),
                                        name: display_name.to_string(),
                                        platform: "epic".into(),
                                        banner_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80".into(),
                                        icon_url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=120".into(),
                                        description: format!("Epic Games installation: {}.", display_name),
                                        launch_target: format!("com.epicgames.launcher://apps/{}?action=launch&silent=true", app_name),
                                        is_running: false,
                                        tag: "Installed".into(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(games)
}

#[tauri::command]
pub async fn launch_universal_game(target: String, platform: String) -> Result<(), String> {
    info!("Launching universal game: {} ({})", target, platform);
    
    if platform == "steam" || platform == "roblox" || platform == "epic" {
        // Open URI protocol
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(["/c", "start", &target])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        return Ok(());
    } else if platform == "custom" {
        // Run executable
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new(&target)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    Err(format!("Platform {} handled separately", platform))
}

fn extract_vdf_value(line: &str) -> Option<&str> {
    let mut parts = line.split('"');
    parts.next()?; // before 1st quote
    parts.next()?; // key
    parts.next()?; // between quotes
    parts.next()   // value
}
