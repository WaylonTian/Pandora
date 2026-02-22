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

#[tauri::command]
pub fn plugin_server_port() -> u16 {
    super::server::get_port()
}

#[tauri::command]
pub fn plugin_get_path(name: String) -> Result<String, String> {
    let p = match name.as_str() {
        "home" => dirs::home_dir(),
        "desktop" => dirs::desktop_dir(),
        "downloads" => dirs::download_dir(),
        "documents" => dirs::document_dir(),
        "temp" => Some(std::env::temp_dir()),
        "appData" => dirs::data_dir(),
        _ => None,
    };
    p.map(|p| p.to_string_lossy().to_string()).ok_or_else(|| format!("Unknown path: {name}"))
}

#[tauri::command]
pub fn plugin_shell_show_item(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    { std::process::Command::new("explorer").arg(format!("/select,{}", path)).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "macos")]
    { std::process::Command::new("open").arg("-R").arg(&path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "linux")]
    { std::process::Command::new("xdg-open").arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new("/"))).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
pub fn plugin_show_open_dialog(options: serde_json::Value) -> Result<Option<Vec<String>>, String> {
    use std::process::Command;
    // Use PowerShell to show file dialog on Windows
    let filters = options.get("filters").and_then(|f| f.as_array());
    let ext_filter = if let Some(filters) = filters {
        filters.iter()
            .filter_map(|f| f.get("extensions").and_then(|e| e.as_array()))
            .flatten()
            .filter_map(|e| e.as_str())
            .map(|e| format!("*.{}", e))
            .collect::<Vec<_>>()
            .join(";")
    } else {
        "*.*".to_string()
    };

    let ps = format!(
        "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Files|{}'; if ($d.ShowDialog() -eq 'OK') {{ $d.FileName }}",
        ext_filter
    );
    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", &ps])
        .output()
        .map_err(|e| e.to_string())?;
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() { Ok(None) } else { Ok(Some(vec![path])) }
}

#[tauri::command]
pub fn plugin_screen_capture() -> Result<String, String> {
    // Use Snipping Tool on Windows, return temp file path
    let tmp = std::env::temp_dir().join(format!("pandora-capture-{}.png", uuid::Uuid::new_v4()));
    let tmp_str = tmp.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        // Use snippingtool /clip, then read from clipboard
        let _ = std::process::Command::new("snippingtool")
            .arg("/clip")
            .status();
        // Read clipboard image via PowerShell
        let ps = format!(
            "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Windows.Forms.Clipboard]::GetImage(); if ($img) {{ $img.Save('{}') }}",
            tmp_str.replace('\\', "\\\\").replace('\'', "''")
        );
        let _ = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-Command", &ps])
            .status();
    }

    if tmp.exists() {
        let data = std::fs::read(&tmp).map_err(|e| e.to_string())?;
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
        std::fs::remove_file(&tmp).ok();
        Ok(format!("data:image/png;base64,{}", b64))
    } else {
        Err("Screenshot cancelled or failed".into())
    }
}
