use anyhow::{Context, Result};
use std::fs::File;
use std::path::{Path, PathBuf};

/// Extract a .zip archive into `target_dir`
pub fn extract_zip(archive_path: &Path, target_dir: &Path) -> Result<()> {
    std::fs::create_dir_all(target_dir).context("Create target directory for zip extraction")?;
    let file = File::open(archive_path).context("Open zip archive")?;
    let mut archive = zip::ZipArchive::new(file).context("Read zip archive")?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).context("Access zip entry")?;
        let outpath = match entry.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => continue,
        };

        if entry.is_dir() {
            std::fs::create_dir_all(&outpath).context("Create directory from zip entry")?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p).context("Create parent directory for zip entry")?;
                }
            }
            let mut outfile = File::create(&outpath).context("Create extracted file")?;
            std::io::copy(&mut entry, &mut outfile).context("Write extracted file")?;
        }
    }

    Ok(())
}

/// Find java executable inside a directory recursively
pub fn find_java_binary(dir: &Path) -> Option<PathBuf> {
    let binary_name = if cfg!(windows) { "javaw.exe" } else { "java" };
    let fallback_name = if cfg!(windows) { "java.exe" } else { "java" };

    if let Ok(entries) = walk_dir_files(dir) {
        for file in entries {
            if let Some(name) = file.file_name().and_then(|n| n.to_str()) {
                if name.eq_ignore_ascii_case(binary_name) {
                    return Some(file);
                }
            }
        }
        // Fallback to java.exe if javaw.exe isn't found
        if let Ok(entries) = walk_dir_files(dir) {
            for file in entries {
                if let Some(name) = file.file_name().and_then(|n| n.to_str()) {
                    if name.eq_ignore_ascii_case(fallback_name) {
                        return Some(file);
                    }
                }
            }
        }
    }
    None
}

fn walk_dir_files(dir: &Path) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    if dir.is_dir() {
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                files.extend(walk_dir_files(&path)?);
            } else {
                files.push(path);
            }
        }
    }
    Ok(files)
}
