use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// A launcher profile (one entry in the Library grid)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub mc_version: String,
    pub fabric_version: Option<String>,
    pub min_ram_mb: u32,
    pub max_ram_mb: u32,
    pub extra_jvm_flags: Vec<String>,
    pub cover_image: Option<PathBuf>,
    /// Total play time in seconds
    pub play_time_secs: u64,
    pub game_dir: PathBuf,
    pub created_at: String,
}

impl Profile {
    pub fn new(name: impl Into<String>, mc_version: impl Into<String>, base_dir: PathBuf) -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        let game_dir = base_dir.join("profiles").join(&id);
        Self {
            id,
            name: name.into(),
            mc_version: mc_version.into(),
            fabric_version: None,
            min_ram_mb: 512,
            max_ram_mb: 4096,
            extra_jvm_flags: vec![],
            cover_image: None,
            play_time_secs: 0,
            game_dir,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}
