use anyhow::{Context, Result};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

/// Exports a profile folder into a shareable .zip modpack file
pub fn export_profile_zip(profile_dir: &Path, output_zip: &Path) -> Result<()> {
    let file = File::create(output_zip).context("Create export zip file")?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in WalkDir::new(profile_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(profile_dir)?;

        if path.is_file() {
            zip.start_file(name.to_string_lossy().replace('\\', "/"), options)?;
            let mut f = File::open(path)?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer)?;
            zip.write_all(&buffer)?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy().replace('\\', "/"), options)?;
        }
    }

    zip.finish()?;
    Ok(())
}

/// Imports a modpack .zip into the given profile directory
pub fn import_profile_zip(zip_file: &Path, target_profile_dir: &Path) -> Result<()> {
    std::fs::create_dir_all(target_profile_dir)?;
    let file = File::open(zip_file).context("Open profile archive")?;
    let mut archive = zip::ZipArchive::new(file).context("Read profile archive")?;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).context("Read profile archive entry")?;
        let Some(relative) = entry.enclosed_name().map(|path| path.to_owned()) else {
            continue;
        };
        if relative == Path::new("profile.json") {
            continue;
        }
        let output = target_profile_dir.join(relative);
        if entry.is_dir() {
            std::fs::create_dir_all(output)?;
            continue;
        }
        if let Some(parent) = output.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let mut destination = File::create(output)?;
        std::io::copy(&mut entry, &mut destination)?;
    }
    Ok(())
}
