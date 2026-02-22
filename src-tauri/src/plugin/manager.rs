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

fn plugins_dir() -> PathBuf {
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

pub fn install_plugin(upxs_path: &Path, name: &str, version: &str, description: &str) -> Result<InstalledPlugin, String> {
    let id = slug_from_name(name);
    let dest = plugins_dir().join(&id);

    if dest.exists() {
        fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
    }

    super::asar::extract_asar(upxs_path, &dest)?;

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
