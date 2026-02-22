use byteorder::{LittleEndian, ReadBytesExt};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

#[derive(Debug, Deserialize)]
struct AsarNode {
    files: Option<HashMap<String, AsarNode>>,
    offset: Option<String>,
    size: Option<u64>,
}

pub fn extract_asar(asar_path: &Path, dest: &Path) -> Result<(), String> {
    let mut file = File::open(asar_path).map_err(|e| format!("Failed to open asar: {e}"))?;

    // Read pickle header: data_size(4) + header_size(4) + header_size(4) + header_json
    file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;
    let header_size = file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;
    file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;
    let json_size = file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;

    let mut header_json = vec![0u8; json_size as usize];
    file.read_exact(&mut header_json).map_err(|e| e.to_string())?;
    let header_str = String::from_utf8(header_json).map_err(|e| e.to_string())?;
    let root: AsarNode = serde_json::from_str(&header_str).map_err(|e| e.to_string())?;

    let content_offset = 4 + header_size as u64 + 4;

    std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    extract_node(&mut file, &root, dest, content_offset)
}

fn extract_node(
    file: &mut File,
    node: &AsarNode,
    dest: &Path,
    content_offset: u64,
) -> Result<(), String> {
    if let Some(ref files) = node.files {
        for (name, child) in files {
            let child_path = dest.join(name);
            if child.files.is_some() {
                std::fs::create_dir_all(&child_path).map_err(|e| e.to_string())?;
                extract_node(file, child, &child_path, content_offset)?;
            } else if let (Some(offset_str), Some(size)) = (&child.offset, child.size) {
                let offset: u64 = offset_str.parse().map_err(|e: std::num::ParseIntError| e.to_string())?;
                file.seek(SeekFrom::Start(content_offset + offset)).map_err(|e| e.to_string())?;
                let mut buf = vec![0u8; size as usize];
                file.read_exact(&mut buf).map_err(|e| e.to_string())?;
                if let Some(parent) = child_path.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                std::fs::write(&child_path, buf).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}
