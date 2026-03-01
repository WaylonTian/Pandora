use super::types::RedisConnectionConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct ConnectionsData {
    connections: Vec<RedisConnectionConfig>,
}

fn get_config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("redis-manager");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn save_connections(app: &tauri::AppHandle, configs: &[RedisConnectionConfig]) -> Result<(), String> {
    let path = get_config_dir(app)?.join("connections.json");
    let data = ConnectionsData { connections: configs.to_vec() };
    fs::write(&path, serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

pub fn load_connections(app: &tauri::AppHandle) -> Result<Vec<RedisConnectionConfig>, String> {
    let path = get_config_dir(app)?.join("connections.json");
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: ConnectionsData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(data.connections)
}

pub fn delete_connection(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let mut conns = load_connections(app)?;
    conns.retain(|c| c.id != id);
    save_connections(app, &conns)
}
