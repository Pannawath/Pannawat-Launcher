use md5::{Digest, Md5};
use uuid::Uuid;

/// Minecraft offline UUID v3 — derived from "OfflinePlayer:{username}"
pub fn offline_uuid(username: &str) -> Uuid {
    let input = format!("OfflinePlayer:{username}");
    let hash = Md5::digest(input.as_bytes());
    let bytes = hash.into();
    // Set version bits (v3) and variant bits (RFC 4122)
    uuid::Builder::from_md5_bytes(bytes).into_uuid()
}

/// Generate a random fake access token (UUID v4)
pub fn fake_access_token() -> String {
    Uuid::new_v4().to_string()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OfflineSession {
    pub username: String,
    pub uuid: String,
    pub access_token: String,
}

impl OfflineSession {
    pub fn new(username: impl Into<String>) -> Self {
        let username = username.into();
        let uuid = offline_uuid(&username).to_string();
        let access_token = fake_access_token();
        Self { username, uuid, access_token }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uuid_is_deterministic() {
        let a = offline_uuid("Pannawath");
        let b = offline_uuid("Pannawath");
        assert_eq!(a, b);
    }

    #[test]
    fn different_usernames_differ() {
        let a = offline_uuid("Pannawath");
        let b = offline_uuid("Steve");
        assert_ne!(a, b);
    }
}
