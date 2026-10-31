use anyhow::{Context, Result};
use downloader::{download_batch, DownloadProgress, DownloadTask};
use serde_json::Value;
use std::path::{Path, PathBuf};
use tracing::info;

/// Result of preparing Minecraft & Fabric assets, jars, and libraries
pub struct PreparedGameFiles {
    pub client_jar: PathBuf,
    pub classpath: Vec<PathBuf>,
    pub main_class: String,
    pub asset_index: String,
    pub game_arguments: Vec<String>,
    pub jvm_arguments: Vec<String>,
}

/// Download and assemble client jar, libraries, and assets
pub async fn prepare_game_environment(
    client: &reqwest::Client,
    runtime_dir: &Path,
    mc_version: &str,
    fabric_version: Option<&str>,
    on_progress: impl Fn(DownloadProgress) + Send + Sync + Clone + 'static,
) -> Result<PreparedGameFiles> {
    let manifest = crate::manifest::fetch_manifest(client).await?;
    let version_entry = manifest
        .versions
        .into_iter()
        .find(|v| v.id == mc_version)
        .context(format!("Version {} not found in Mojang manifest", mc_version))?;

    let version_json = crate::manifest::fetch_version_json(client, &version_entry).await?;

    let mut download_tasks: Vec<DownloadTask> = Vec::new();
    let mut classpath: Vec<PathBuf> = Vec::new();

    // 1. Client Jar
    let client_download = version_json["downloads"]["client"]
        .as_object()
        .context("Missing client download in version JSON")?;
    let client_url = client_download["url"].as_str().unwrap().to_string();
    let client_sha1 = client_download["sha1"].as_str().map(String::from);
    let client_size = client_download["size"].as_u64();
    let client_jar_path = runtime_dir
        .join("versions")
        .join(mc_version)
        .join(format!("{}.jar", mc_version));

    download_tasks.push(DownloadTask {
        url: client_url,
        dest: client_jar_path.clone(),
        sha1: client_sha1,
        size: client_size,
    });
    classpath.push(client_jar_path.clone());

    // 2. Mojang Libraries
    if let Some(libs) = version_json["libraries"].as_array() {
        for lib in libs {
            if is_library_allowed_on_os(lib, "windows") {
                if let Some(artifact) = lib["downloads"]["artifact"].as_object() {
                    let url = artifact["url"].as_str().unwrap().to_string();
                    let sha1 = artifact["sha1"].as_str().map(String::from);
                    let size = artifact["size"].as_u64();
                    let rel_path = artifact["path"].as_str().unwrap().replace('/', "\\");
                    let dest = runtime_dir.join("libraries").join(rel_path);

                    classpath.push(dest.clone());
                    download_tasks.push(DownloadTask {
                        url,
                        dest,
                        sha1,
                        size,
                    });
                }
            }
        }
    }

    // 3. Fabric Profile (if specified)
    let mut main_class = version_json["mainClass"]
        .as_str()
        .unwrap_or("net.minecraft.client.main.Main")
        .to_string();

    if let Some(loader_ver) = fabric_version {
        let fabric_profile =
            crate::fabric::get_profile_json(client, mc_version, loader_ver).await?;

        if let Some(f_main) = fabric_profile["mainClass"].as_str() {
            main_class = f_main.to_string();
        }

        if let Some(f_libs) = fabric_profile["libraries"].as_array() {
            for f_lib in f_libs {
                let name = f_lib["name"].as_str().unwrap_or_default();
                let url_base = f_lib["url"]
                    .as_str()
                    .unwrap_or("https://maven.fabricmc.net/");

                if let Some((rel_path, filename)) = parse_maven_coordinate(name) {
                    let full_url = format!("{}{}/{}", url_base, rel_path.replace('\\', "/"), filename);
                    let dest = runtime_dir.join("libraries").join(&rel_path).join(&filename);

                    classpath.push(dest.clone());
                    download_tasks.push(DownloadTask {
                        url: full_url,
                        dest,
                        sha1: None,
                        size: None,
                    });
                }
            }
        }
    }

    // 4. Asset Index & Assets
    let asset_index_id = version_json["assetIndex"]["id"]
        .as_str()
        .unwrap_or("legacy")
        .to_string();

    if let Some(asset_index_url) = version_json["assetIndex"]["url"].as_str() {
        let index_dest = runtime_dir
            .join("assets")
            .join("indexes")
            .join(format!("{}.json", asset_index_id));

        if !index_dest.exists() {
            if let Some(parent) = index_dest.parent() {
                tokio::fs::create_dir_all(parent).await?;
            }
            let index_bytes = client.get(asset_index_url).send().await?.bytes().await?;
            tokio::fs::write(&index_dest, &index_bytes).await?;
        }

        // Parse asset objects and add to download list
        if let Ok(index_content) = std::fs::read_to_string(&index_dest) {
            if let Ok(index_json) = serde_json::from_str::<Value>(&index_content) {
                if let Some(objects) = index_json["objects"].as_object() {
                    for (_name, obj) in objects {
                        if let Some(hash) = obj["hash"].as_str() {
                            let prefix = &hash[..2];
                            let asset_url = format!(
                                "https://resources.download.minecraft.net/{}/{}",
                                prefix, hash
                            );
                            let dest = runtime_dir
                                .join("assets")
                                .join("objects")
                                .join(prefix)
                                .join(hash);

                            download_tasks.push(DownloadTask {
                                url: asset_url,
                                dest,
                                sha1: Some(hash.to_string()),
                                size: obj["size"].as_u64(),
                            });
                        }
                    }
                }
            }
        }
    }

    info!(
        "Batch downloading {} files (client, libraries, assets)...",
        download_tasks.len()
    );
    download_batch(client.clone(), download_tasks, 16, on_progress).await;

    Ok(PreparedGameFiles {
        client_jar: client_jar_path,
        classpath,
        main_class,
        asset_index: asset_index_id,
        game_arguments: vec![],
        jvm_arguments: vec![],
    })
}

/// Checks whether an operating system rule matches Windows
fn is_library_allowed_on_os(lib: &Value, os_name: &str) -> bool {
    if let Some(rules) = lib["rules"].as_array() {
        let mut allow = false;
        for rule in rules {
            let action = rule["action"].as_str().unwrap_or("disallow");
            let target_os = rule["os"]["name"].as_str();

            if let Some(os) = target_os {
                if os == os_name {
                    allow = action == "allow";
                }
            } else {
                allow = action == "allow";
            }
        }
        allow
    } else {
        true
    }
}

/// Converts maven identifier `group:artifact:version` into relative directory and jar filename
fn parse_maven_coordinate(coord: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = coord.split(':').collect();
    if parts.len() < 3 {
        return None;
    }
    let group_dir = parts[0].replace('.', "\\");
    let artifact = parts[1];
    let version = parts[2];
    let filename = format!("{}-{}.jar", artifact, version);
    let rel_path = format!("{}\\{}\\{}", group_dir, artifact, version);
    Some((rel_path, filename))
}
