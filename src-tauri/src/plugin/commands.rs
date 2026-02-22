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

    // Reject encrypted .upxs files early
    if download_url.ends_with(".upxs") {
        return Err("该插件使用加密格式(.upxs)，仅 uTools 客户端可安装。请选择其他插件。".into());
    }

    let ext = if download_url.ends_with(".upx") { "upx" } else { "zip" };
    let tmp = std::env::temp_dir().join(format!("pandora-{}.{}", uuid::Uuid::new_v4(), ext));
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

#[tauri::command]
pub fn plugin_show_save_dialog(options: serde_json::Value) -> Result<Option<String>, String> {
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
        "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.SaveFileDialog; $d.Filter = 'Files|{}'; if ($d.ShowDialog() -eq 'OK') {{ $d.FileName }}",
        ext_filter
    );
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", &ps])
        .output()
        .map_err(|e| e.to_string())?;
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() { Ok(None) } else { Ok(Some(path)) }
}

#[tauri::command]
pub fn plugin_shell_trash_item(path: String) -> Result<(), String> {
    let ps = format!(
        "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('{}', 'OnlyErrorDialogs', 'SendToRecycleBin')",
        path.replace('\'', "''")
    );
    std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", &ps])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn plugin_shell_beep() -> Result<(), String> {
    std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", "[Console]::Beep()"])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn plugin_get_native_id() -> String {
    "pandora-native-id".to_string()
}

#[tauri::command]
pub fn plugin_get_app_name() -> String {
    "Pandora".to_string()
}

#[tauri::command]
pub fn plugin_is_dev() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
pub fn plugin_get_file_icon(path: String) -> Result<String, String> {
    let ps = format!(
        "Add-Type -AssemblyName System.Drawing; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{}'); $ms = New-Object System.IO.MemoryStream; $icon.ToBitmap().Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [Convert]::ToBase64String($ms.ToArray())",
        path.replace('\'', "''")
    );
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", &ps])
        .output()
        .map_err(|e| e.to_string())?;
    let b64 = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if b64.is_empty() { Err("Failed to extract icon".into()) } else { Ok(format!("data:image/png;base64,{}", b64)) }
}

#[tauri::command]
pub fn plugin_get_copyed_files() -> Result<Vec<String>, String> {
    let ps = "Add-Type -AssemblyName System.Windows.Forms; $files = [System.Windows.Forms.Clipboard]::GetFileDropList(); $files | ForEach-Object { $_ }";
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", ps])
        .output()
        .map_err(|e| e.to_string())?;
    let files = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    Ok(files)
}

#[tauri::command]
pub fn plugin_paste_file(path: String) -> Result<(), String> {
    let ps = format!(
        "Add-Type -AssemblyName System.Windows.Forms; $col = New-Object System.Collections.Specialized.StringCollection; $col.Add('{}'); [System.Windows.Forms.Clipboard]::SetFileDropList($col); [System.Windows.Forms.SendKeys]::SendWait('^v')",
        path.replace('\'', "''")
    );
    std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", &ps])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn plugin_paste_image(base64: String) -> Result<(), String> {
    let ps = format!(
        "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bytes = [Convert]::FromBase64String('{}'); $ms = New-Object System.IO.MemoryStream(,$bytes); $img = [System.Drawing.Image]::FromStream($ms); [System.Windows.Forms.Clipboard]::SetImage($img); [System.Windows.Forms.SendKeys]::SendWait('^v')",
        base64
    );
    std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", &ps])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// P2: Simulate commands
#[tauri::command]
pub fn plugin_simulate_keyboard_tap(key: String, modifiers: Vec<String>) -> Result<(), String> {
    super::simulate::keyboard_tap(&key, &modifiers)
}

#[tauri::command]
pub fn plugin_simulate_mouse_move(x: i32, y: i32) -> Result<(), String> {
    super::simulate::mouse_move(x, y)
}

#[tauri::command]
pub fn plugin_simulate_mouse_click(x: i32, y: i32) -> Result<(), String> {
    super::simulate::mouse_click(x, y)
}

#[tauri::command]
pub fn plugin_simulate_mouse_double_click(x: i32, y: i32) -> Result<(), String> {
    super::simulate::mouse_double_click(x, y)
}

#[tauri::command]
pub fn plugin_simulate_mouse_right_click(x: i32, y: i32) -> Result<(), String> {
    super::simulate::mouse_right_click(x, y)
}

// P2: Screen commands
#[tauri::command]
pub fn plugin_get_primary_display() -> Result<serde_json::Value, String> {
    super::screen::get_primary_display()
}

#[tauri::command]
pub fn plugin_get_all_displays() -> Result<Vec<serde_json::Value>, String> {
    super::screen::get_all_displays()
}

#[tauri::command]
pub fn plugin_get_cursor_screen_point() -> Result<serde_json::Value, String> {
    super::screen::get_cursor_screen_point()
}

#[tauri::command]
pub fn plugin_screen_color_pick() -> Result<String, String> {
    super::screen::screen_color_pick()
}

#[tauri::command]
pub fn plugin_get_display_nearest_point(x: i32, y: i32) -> Result<serde_json::Value, String> {
    super::screen::get_display_nearest_point(x, y)
}

#[tauri::command]
pub fn plugin_screen_to_dip_point(x: i32, y: i32) -> Result<serde_json::Value, String> {
    super::screen::screen_to_dip_point(x, y)
}

#[tauri::command]
pub fn plugin_dip_to_screen_point(x: i32, y: i32) -> Result<serde_json::Value, String> {
    super::screen::dip_to_screen_point(x, y)
}

// P3: Sharp commands
#[tauri::command]
pub fn sharp_metadata(input: String) -> Result<serde_json::Value, String> {
    super::sharp::metadata(input)
}
#[tauri::command]
pub fn sharp_resize(input: String, width: u32, height: u32, output: String) -> Result<(), String> {
    super::sharp::resize(input, width, height, output)
}
#[tauri::command]
pub fn sharp_rotate(input: String, degrees: i32, output: String) -> Result<(), String> {
    super::sharp::rotate(input, degrees, output)
}
#[tauri::command]
pub fn sharp_flip(input: String, direction: String, output: String) -> Result<(), String> {
    super::sharp::flip(input, direction, output)
}
#[tauri::command]
pub fn sharp_crop(input: String, x: u32, y: u32, w: u32, h: u32, output: String) -> Result<(), String> {
    super::sharp::crop(input, x, y, w, h, output)
}
#[tauri::command]
pub fn sharp_blur(input: String, sigma: f32, output: String) -> Result<(), String> {
    super::sharp::blur(input, sigma, output)
}
#[tauri::command]
pub fn sharp_grayscale(input: String, output: String) -> Result<(), String> {
    super::sharp::grayscale(input, output)
}
#[tauri::command]
pub fn sharp_to_format(input: String, format: String, output: String) -> Result<(), String> {
    super::sharp::to_format(input, format, output)
}
#[tauri::command]
pub fn sharp_to_base64(input: String, format: String) -> Result<String, String> {
    super::sharp::to_base64(input, format)
}

// P4: FFmpeg commands
#[tauri::command]
pub fn ffmpeg_is_available() -> bool {
    super::ffmpeg::is_available()
}
#[tauri::command]
pub fn ffmpeg_run(args: Vec<String>) -> Result<String, String> {
    super::ffmpeg::run(args)
}
#[tauri::command]
pub fn ffmpeg_probe(input: String) -> Result<String, String> {
    super::ffmpeg::probe(input)
}

// P3: UBrowser command
#[tauri::command]
pub async fn ubrowser_run(app: tauri::AppHandle, ops: Vec<super::ubrowser::UBrowserOp>, options: super::ubrowser::UBrowserRunOptions) -> Result<serde_json::Value, String> {
    let script = super::ubrowser::build_execute_script(&ops);
    let label = format!("ubrowser-{}", uuid::Uuid::new_v4());
    let width = options.width.unwrap_or(1280) as f64;
    let height = options.height.unwrap_or(800) as f64;
    let show = options.show.unwrap_or(false);

    // Find the goto URL from ops
    let url = ops.iter()
        .find(|o| o.action == "goto")
        .and_then(|o| o.args.first())
        .and_then(|v| v.as_str())
        .unwrap_or("about:blank")
        .to_string();

    let parsed_url: tauri::Url = url.parse().map_err(|e| format!("{e}"))?;
    let window = tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::External(parsed_url))
        .inner_size(width, height)
        .visible(show)
        .build()
        .map_err(|e| e.to_string())?;

    // Wait for page load then execute script
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    let result = window.eval(&script).map_err(|e| e.to_string())?;
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    // Close the window
    window.close().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({"ok": true}))
}
