use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginFeature {
    pub code: String,
    pub explain: Option<String>,
    pub icon: Option<String>,
    pub cmds: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub main: Option<String>,
    pub logo: Option<String>,
    pub preload: Option<String>,
    pub features: Vec<PluginFeature>,
    #[serde(rename = "pluginSetting")]
    pub plugin_setting: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub logo: Option<String>,
    pub path: String,
    pub manifest: PluginManifest,
    pub enabled: bool,
    pub installed_at: String,
}

pub fn plugins_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("pandora").join("plugins")
}

fn registry_path() -> PathBuf {
    plugins_dir().join("registry.json")
}

fn load_registry() -> Vec<InstalledPlugin> {
    let path = registry_path();
    if path.exists() {
        let data = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        vec![]
    }
}

fn save_registry(plugins: &[InstalledPlugin]) -> Result<(), String> {
    let path = registry_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(plugins).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn install_plugin(pkg_path: &Path, name: &str, version: &str, description: &str) -> Result<InstalledPlugin, String> {
    let id = slug_from_name(name);
    let dest = plugins_dir().join(&id);

    if dest.exists() {
        fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
    }

    // Try asar first, then zip, then copy directory
    if pkg_path.is_dir() {
        copy_dir_recursive(pkg_path, &dest)?;
    } else {
        let bytes = fs::read(pkg_path).map_err(|e| e.to_string())?;
        if bytes.len() < 16 {
            return Err("Package file too small".into());
        }
        // .upxs: first 4 bytes = header_len (small u32), followed by encrypted data
        let maybe_header_len = u32::from_le_bytes(bytes[0..4].try_into().unwrap()) as usize;
        let upxs_ok = maybe_header_len > 0 && maybe_header_len < 10000
            && bytes[4] != 0x1f && bytes[0..2] != [0x50, 0x4B]
            && bytes.len() > 4 + maybe_header_len + 16;

        if upxs_ok {
            let gzipped = decrypt_upxs(&bytes)?;
            let decompressed = decompress_gzip(&gzipped)?;
            let tmp_asar = pkg_path.with_extension("asar.tmp");
            fs::write(&tmp_asar, &decompressed).map_err(|e| e.to_string())?;
            let result = super::asar::extract_asar(&tmp_asar, &dest);
            fs::remove_file(&tmp_asar).ok();
            result?;
        }
        // Gzip magic (1f 8b) — .upx files are gzip'd asar
        else if bytes[0] == 0x1f && bytes[1] == 0x8b {
            let decompressed = decompress_gzip(&bytes)?;
            let tmp_asar = pkg_path.with_extension("asar.tmp");
            fs::write(&tmp_asar, &decompressed).map_err(|e| e.to_string())?;
            let result = super::asar::extract_asar(&tmp_asar, &dest);
            fs::remove_file(&tmp_asar).ok();
            result?;
        }
        // ZIP magic (PK\x03\x04)
        else if bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04 {
            extract_zip(pkg_path, &dest)?;
        } else {
            // Try asar format directly
            match super::asar::extract_asar(pkg_path, &dest) {
                Ok(()) => {},
                Err(e) => {
                    fs::remove_dir_all(&dest).ok();
                    return Err(format!(
                        "Unsupported package format. Only .asar, .upx, .upxs, and .zip are supported. Error: {e}"
                    ));
                }
            }
        }
    }

    let manifest_path = dest.join("plugin.json");
    if !manifest_path.exists() {
        fs::remove_dir_all(&dest).ok();
        return Err("plugin.json not found in package".into());
    }

    let manifest_str = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: PluginManifest = serde_json::from_str(&manifest_str).map_err(|e| e.to_string())?;

    let plugin = InstalledPlugin {
        id: id.clone(),
        name: name.to_string(),
        version: version.to_string(),
        description: description.to_string(),
        logo: manifest.logo.clone(),
        path: dest.to_string_lossy().to_string(),
        manifest,
        enabled: true,
        installed_at: chrono::Utc::now().to_rfc3339(),
    };

    let mut registry = load_registry();
    registry.retain(|p| p.id != id);
    registry.push(plugin.clone());
    save_registry(&registry)?;

    Ok(plugin)
}

/// Decrypt .upxs encrypted plugin package → returns gzip'd asar bytes
fn decrypt_upxs(data: &[u8]) -> Result<Vec<u8>, String> {
    use chacha20poly1305::{XChaCha20Poly1305, aead::{Aead, KeyInit}};
    use aes::cipher::{BlockDecryptMut, KeyIvInit, block_padding::Pkcs7};

    if data.len() < 8 { return Err("upxs too small".into()); }
    let header_len = u32::from_le_bytes(data[0..4].try_into().unwrap()) as usize;
    if data.len() < 4 + header_len { return Err("upxs header truncated".into()); }

    // XChaCha20-Poly1305 key/nonce (extracted from uTools addon)
    let xkey: [u8; 32] = *b">7FFq#LK?L|J0.d(pFGy~e7$;w]]uTOX";
    let xnonce: [u8; 24] = *b"A6FG`e93]/}42KauX[OIQrN:";

    let cipher = XChaCha20Poly1305::new((&xkey).into());
    let header_json = cipher.decrypt((&xnonce).into(), &data[4..4 + header_len])
        .map_err(|_| "upxs header decryption failed")?;

    #[derive(serde::Deserialize)]
    struct UpxsHeader { key: String, iv: String }
    let h: UpxsHeader = serde_json::from_slice(&header_json)
        .map_err(|e| format!("upxs header parse: {e}"))?;

    let aes_key = hex::decode(&h.key).map_err(|e| format!("bad aes key: {e}"))?;
    let aes_iv  = hex::decode(&h.iv).map_err(|e| format!("bad aes iv: {e}"))?;

    type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;
    let body = &data[4 + header_len..];
    let mut buf = body.to_vec();
    let decrypted = Aes256CbcDec::new_from_slices(&aes_key, &aes_iv)
        .map_err(|e| format!("aes init: {e}"))?
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|_| "AES-CBC decryption failed")?;

    Ok(decrypted.to_vec())
}

fn decompress_gzip(data: &[u8]) -> Result<Vec<u8>, String> {
    use std::io::Read;
    let mut decoder = flate2::read::GzDecoder::new(data);
    let mut out = Vec::new();
    decoder.read_to_end(&mut out).map_err(|e| format!("Gzip decompression failed: {e}"))?;
    Ok(out)
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), String> {
    let file = fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let out_path = dest.join(entry.mangled_name());
        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let target = dest.join(entry.file_name());
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), &target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn uninstall_plugin(id: &str) -> Result<(), String> {
    let mut registry = load_registry();
    if let Some(plugin) = registry.iter().find(|p| p.id == id) {
        let path = Path::new(&plugin.path);
        if path.exists() {
            fs::remove_dir_all(path).map_err(|e| e.to_string())?;
        }
    }
    registry.retain(|p| p.id != id);
    save_registry(&registry)?;

    let db_dir = plugins_dir().parent().unwrap().join("plugin-db").join(id);
    if db_dir.exists() {
        fs::remove_dir_all(db_dir).ok();
    }
    Ok(())
}

pub fn list_plugins() -> Vec<InstalledPlugin> {
    load_registry()
}

pub fn get_plugin(id: &str) -> Option<InstalledPlugin> {
    load_registry().into_iter().find(|p| p.id == id)
}

pub fn toggle_plugin(id: &str, enabled: bool) -> Result<(), String> {
    let mut registry = load_registry();
    if let Some(p) = registry.iter_mut().find(|p| p.id == id) {
        p.enabled = enabled;
    }
    save_registry(&registry)
}

fn slug_from_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
