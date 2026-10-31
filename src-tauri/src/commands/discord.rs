use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::info;

const DISCORD_APP_ID: &str = "1301490204987723827";

static DISCORD_CLIENT: Mutex<Option<DiscordIpcClient>> = Mutex::new(None);

pub fn init_discord_rpc() {
    thread::spawn(|| {
        let mut client = DiscordIpcClient::new(DISCORD_APP_ID);
        if client.connect().is_ok() {
            info!("Discord RPC Connected successfully");
            let mut guard = DISCORD_CLIENT.lock().unwrap();
            *guard = Some(client);
            drop(guard);
            update_presence_idle();
        }
    });
}

pub fn update_presence_playing(game_name: &str, details_str: &str) {
    let mut guard = DISCORD_CLIENT.lock().unwrap();
    if let Some(ref mut client) = *guard {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let details = format!("Playing {}", game_name);

        let activity = activity::Activity::new()
            .state(details_str)
            .details(&details)
            .timestamps(activity::Timestamps::new().start(now))
            .assets(
                activity::Assets::new()
                    .large_image("minecraft_logo")
                    .large_text("Pannawat Launcher"),
            );

        let _ = client.set_activity(activity);
    }
}

pub fn update_presence_idle() {
    let mut guard = DISCORD_CLIENT.lock().unwrap();
    if let Some(ref mut client) = *guard {
        let activity = activity::Activity::new()
            .state("Browsing Games")
            .details("Universal Game Launcher")
            .assets(
                activity::Assets::new()
                    .large_image("minecraft_logo")
                    .large_text("Pannawat Launcher"),
            );

        let _ = client.set_activity(activity);
    }
}

#[tauri::command]
pub async fn set_discord_presence(game_name: String, status: String) -> Result<(), String> {
    if status == "playing" {
        update_presence_playing(&game_name, "Active Session");
    } else {
        update_presence_idle();
    }
    Ok(())
}
