use anyhow::Result;
use serde::{Deserialize, Serialize};

pub mod modrinth;
pub mod curseforge;
pub mod resolver;

/// A mod entry stored in a profile's mod list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledMod {
    pub id: String,
    pub name: String,
    pub version: String,
    pub source: ModSource,
    pub filename: String,
    pub sha1: Option<String>,
    pub enabled: bool,
    pub icon_url: Option<String>,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModSource {
    Modrinth,
    CurseForge,
    Local,
}

/// Dependency conflict detected between two mods
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModConflict {
    pub mod_id: String,
    pub conflicts_with: String,
    pub reason: String,
}
