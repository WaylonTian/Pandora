use super::{manager, db, marketplace};
use serde_json::Value;
use std::path::PathBuf;

#[tauri::command]
pub fn plugin_list() -> Vec<manager::InstalledPlugin> {
    manager::list_plugins()
}

#[tauri::command]
pub fn plugin_get(id: String) -> Option<manager::InstalledPlugin> {
    manager::get_plugin(&id)
}

#[tauri::command]
pub fn plugin_uninstall(id: String) -> Result<(), String> {
    manager::uninstall_plugin(&id)
}

#[tauri::command]
pub fn plugin_toggle(id: String, enabled: bool) -> Result<(), String> {
    manager::toggle_plugin(&id, enabled)
}

#[tauri::command]
pub async fn plugin_install_from_market(name: String) -> Result<manager::InstalledPlugin, String> {
    let detail = marketplace::get_plugin_detail(&name).await?;
    let download_url = detail.download_url.ok_or("No download URL found")?;

    let tmp = std::env::temp_dir().join(format!("pandora-{}.upxs", uuid::Uuid::new_v4()));
    marketplace::download_plugin(&download_url, &tmp).await?;

    let result = manager::install_plugin(&tmp, &name, &detail.version, &detail.size);
    std::fs::remove_file(&tmp).ok();
    result
}

#[tauri::command]
pub async fn plugin_install_from_file(path: String) -> Result<manager::InstalledPlugin, String> {
    manager::install_plugin(&PathBuf::from(&path), "local-plugin", "0.0.0", "")
}

#[tauri::command]
pub fn plugin_db_put(plugin_id: String, doc: db::DbDoc) -> Result<db::DbResult, String> {
    db::put(&plugin_id, doc)
}

#[tauri::command]
pub fn plugin_db_get(plugin_id: String, id: String) -> Result<Option<Value>, String> {
    db::get(&plugin_id, &id)
}

#[tauri::command]
pub fn plugin_db_remove(plugin_id: String, id: String) -> Result<db::DbResult, String> {
    db::remove(&plugin_id, &id)
}

#[tauri::command]
pub fn plugin_db_all(plugin_id: String, prefix: Option<String>) -> Result<Vec<Value>, String> {
    db::all_docs(&plugin_id, prefix.as_deref())
}

#[tauri::command]
pub fn plugin_db_put_attachment(plugin_id: String, id: String, data: Vec<u8>, mime: String) -> Result<db::DbResult, String> {
    db::post_attachment(&plugin_id, &id, data, &mime)
}

#[tauri::command]
pub fn plugin_db_get_attachment(plugin_id: String, id: String) -> Result<Option<Vec<u8>>, String> {
    db::get_attachment(&plugin_id, &id)
}

#[tauri::command]
pub async fn marketplace_search(query: String) -> Result<Vec<marketplace::MarketPlugin>, String> {
    marketplace::search_plugins(&query).await
}

#[tauri::command]
pub async fn marketplace_topic(topic_id: u32) -> Result<Vec<marketplace::MarketPlugin>, String> {
    marketplace::list_topic(topic_id).await
}

#[tauri::command]
pub async fn marketplace_detail(name: String) -> Result<marketplace::MarketPluginDetail, String> {
    marketplace::get_plugin_detail(&name).await
}

#[tauri::command]
pub fn plugin_read_file(plugin_id: String, path: String) -> Result<Vec<u8>, String> {
    let file_path = manager::plugins_dir().join(&plugin_id).join(&path);
    // Prevent path traversal
    if path.contains("..") {
        return Err("Invalid path".into());
    }
    std::fs::read(&file_path).map_err(|e| format!("Failed to read {path}: {e}"))
}

#[tauri::command]
pub fn plugin_write_shim(plugin_id: String, content: String) -> Result<(), String> {
    let file_path = manager::plugins_dir().join(&plugin_id).join("__shim__.js");
    std::fs::write(&file_path, content.as_bytes()).map_err(|e| e.to_string())
}
