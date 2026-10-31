use anyhow::{Context, Result};
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
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
    downloader::extract_zip(zip_file, target_profile_dir)
}
