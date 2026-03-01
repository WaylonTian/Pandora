use std::path::PathBuf;

#[tauri::command]
pub fn node_fs_read_file(path: String, _encoding: Option<String>) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_fs_write_file(path: String, data: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_fs_mkdir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_fs_readdir(path: String) -> Result<Vec<String>, String> {
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    Ok(entries.filter_map(|e| e.ok().map(|e| e.file_name().to_string_lossy().to_string())).collect())
}

#[tauri::command]
pub fn node_fs_unlink(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_os_homedir() -> String {
    dirs::home_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
}

#[tauri::command]
pub fn node_os_tmpdir() -> String {
    std::env::temp_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub async fn node_exec(cmd: String) -> Result<String, String> {
    let output = tokio::process::Command::new(if cfg!(windows) { "cmd" } else { "sh" })
        .args(if cfg!(windows) { vec!["/C", &cmd] } else { vec!["-c", &cmd] })
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
