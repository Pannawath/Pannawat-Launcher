use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::info;

// Official / Community Minecraft Discord Application ID
// Registered as "Minecraft" on Discord so user profile displays "Playing Minecraft"
const DISCORD_APP_ID: &str = "432980957394370572";

static DISCORD_CLIENT: Mutex<Option<DiscordIpcClient>> = Mutex::new(None);

fn ensure_connected() {
    if let Ok(mut guard) = DISCORD_CLIENT.lock() {
        if guard.is_none() {
            let mut client = DiscordIpcClient::new(DISCORD_APP_ID);
            if client.connect().is_ok() {
                info!("Connected to Discord IPC successfully.");
                *guard = Some(client);
            }
        }
    }
}

pub fn init_discord_rpc() {
    thread::spawn(|| {
        ensure_connected();
        update_presence_idle();
    });
}

pub fn update_presence_playing(game_name: &str, mc_version: &str) {
    ensure_connected();

    if let Ok(mut guard) = DISCORD_CLIENT.lock() {
        if let Some(ref mut client) = *guard {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            let state_str = format!("Instance: {}", game_name);
            let details_str = format!("Version {}", mc_version);

            let activity = activity::Activity::new()
                .state(&state_str)
                .details(&details_str)
                .timestamps(activity::Timestamps::new().start(now))
                .assets(
                    activity::Assets::new()
                        .large_image("default")
                        .large_text("Minecraft"),
                );

            if client.set_activity(activity).is_err() {
                // If pipe was disconnected, attempt reconnect once
                let _ = client.reconnect();
            }
        }
    }
}

pub fn update_presence_idle() {
    ensure_connected();

    if let Ok(mut guard) = DISCORD_CLIENT.lock() {
        if let Some(ref mut client) = *guard {
            let activity = activity::Activity::new()
                .state("In Launcher")
                .details("Modrinth Library")
                .assets(
                    activity::Assets::new()
                        .large_image("default")
                        .large_text("Minecraft"),
                );

            let _ = client.set_activity(activity);
        }
    }
}

#[allow(dead_code)]
pub fn clear_presence() {
    if let Ok(mut guard) = DISCORD_CLIENT.lock() {
        if let Some(ref mut client) = *guard {
            let _ = client.clear_activity();
        }
    }
}

#[tauri::command]
pub async fn set_discord_presence(game_name: String, status: String) -> Result<(), String> {
    if status == "playing" {
        update_presence_playing(&game_name, "Active");
    } else {
        update_presence_idle();
    }
    Ok(())
}
