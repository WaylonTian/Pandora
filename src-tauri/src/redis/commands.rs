use super::types::{KeyInfo, RedisConnectionConfig, RedisValue, ScanResult};
use super::{config, connection::RedisState};
use crate::AppState;
use redis::AsyncCommands;
use tauri::State;

fn format_redis_value(val: &redis::Value) -> String {
    match val {
        redis::Value::Nil => "(nil)".into(),
        redis::Value::Int(i) => format!("(integer) {}", i),
        redis::Value::BulkString(b) => String::from_utf8_lossy(b).to_string(),
        redis::Value::Array(arr) => {
            if arr.is_empty() { return "(empty array)".into(); }
            arr.iter().enumerate()
                .map(|(i, v)| format!("{}) {}", i + 1, format_redis_value(v)))
                .collect::<Vec<_>>().join("\n")
        }
        redis::Value::SimpleString(s) => s.clone(),
        redis::Value::Okay => "OK".into(),
        redis::Value::ServerError(e) => format!("(error) {}", e.details().unwrap_or("")),
        _ => format!("{:?}", val),
    }
}

// === Config commands ===

#[tauri::command]
pub async fn redis_save_config(config: RedisConnectionConfig, app: tauri::AppHandle) -> Result<(), String> {
    let mut conns = config::load_connections(&app)?;
    if let Some(existing) = conns.iter_mut().find(|c| c.id == config.id) {
        *existing = config;
    } else {
        conns.push(config);
    }
    config::save_connections(&app, &conns)
}

#[tauri::command]
pub async fn redis_load_configs(app: tauri::AppHandle) -> Result<Vec<RedisConnectionConfig>, String> {
    config::load_connections(&app)
}

#[tauri::command]
pub async fn redis_delete_config(id: String, app: tauri::AppHandle) -> Result<(), String> {
    config::delete_connection(&app, &id)
}

// === Connection commands ===

#[tauri::command]
pub async fn redis_test_connection(config: RedisConnectionConfig) -> Result<(), String> {
    RedisState::test_connection(&config).await
}

#[tauri::command]
pub async fn redis_connect(id: String, config: RedisConnectionConfig, state: State<'_, AppState>) -> Result<(), String> {
    state.redis_state.connect(&id, &config).await
}

#[tauri::command]
pub async fn redis_disconnect(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.redis_state.disconnect(&id).await;
    Ok(())
}

// === Key commands ===

#[tauri::command]
pub async fn redis_scan_keys(id: String, cursor: u64, pattern: String, count: u64, state: State<'_, AppState>) -> Result<ScanResult, String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    let (new_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
        .arg(cursor).arg("MATCH").arg(&pattern).arg("COUNT").arg(count)
        .query_async(&mut con).await.map_err(|e| e.to_string())?;

    let mut key_infos = Vec::with_capacity(keys.len());
    for key in keys {
        let key_type: String = redis::cmd("TYPE").arg(&key).query_async(&mut con).await.unwrap_or_default();
        let ttl: i64 = redis::cmd("TTL").arg(&key).query_async(&mut con).await.unwrap_or(-2);
        let size: i64 = redis::cmd("MEMORY").arg("USAGE").arg(&key).query_async(&mut con).await.unwrap_or(-1);
        key_infos.push(KeyInfo { key, key_type, ttl, size });
    }
    Ok(ScanResult { cursor: new_cursor, keys: key_infos })
}

#[tauri::command]
pub async fn redis_get_key_value(id: String, key: String, state: State<'_, AppState>) -> Result<RedisValue, String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    let key_type: String = redis::cmd("TYPE").arg(&key).query_async(&mut con).await.map_err(|e| e.to_string())?;

    match key_type.as_str() {
        "string" => {
            let val: Vec<u8> = con.get(&key).await.map_err(|e| e.to_string())?;
            Ok(RedisValue::String(val))
        }
        "hash" => {
            let val: Vec<(String, String)> = con.hgetall(&key).await.map_err(|e| e.to_string())?;
            Ok(RedisValue::Hash(val))
        }
        "list" => {
            let val: Vec<String> = con.lrange(&key, 0, -1).await.map_err(|e| e.to_string())?;
            Ok(RedisValue::List(val))
        }
        "set" => {
            let val: Vec<String> = con.smembers(&key).await.map_err(|e| e.to_string())?;
            Ok(RedisValue::Set(val))
        }
        "zset" => {
            let val: Vec<(String, f64)> = con.zrange_withscores(&key, 0, -1).await.map_err(|e| e.to_string())?;
            Ok(RedisValue::ZSet(val))
        }
        _ => Ok(RedisValue::None),
    }
}

#[tauri::command]
pub async fn redis_set_string(id: String, key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.set::<_, _, ()>(&key, &value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn redis_delete_keys(id: String, keys: Vec<String>, state: State<'_, AppState>) -> Result<u64, String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.del::<_, u64>(&keys).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn redis_rename_key(id: String, key: String, new_key: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.rename::<_, _, ()>(&key, &new_key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn redis_set_ttl(id: String, key: String, ttl: i64, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    if ttl < 0 {
        con.persist::<_, ()>(&key).await.map_err(|e| e.to_string())
    } else {
        con.expire::<_, ()>(&key, ttl).await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn redis_get_server_info(id: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    redis::cmd("INFO").query_async::<String>(&mut con).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn redis_execute_command(id: String, command: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() { return Err("Empty command".into()); }
    let mut cmd = redis::cmd(parts[0]);
    for arg in &parts[1..] { cmd.arg(*arg); }
    let val: redis::Value = cmd.query_async(&mut con).await.map_err(|e| e.to_string())?;
    Ok(format_redis_value(&val))
}

// === Hash commands ===

#[tauri::command]
pub async fn redis_hash_set(id: String, key: String, field: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.hset::<_, _, _, ()>(&key, &field, &value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn redis_hash_del(id: String, key: String, field: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.hdel::<_, _, ()>(&key, &field).await.map_err(|e| e.to_string())
}

// === List commands ===

#[tauri::command]
pub async fn redis_list_push(id: String, key: String, value: String, head: bool, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    if head {
        con.lpush::<_, _, ()>(&key, &value).await.map_err(|e| e.to_string())
    } else {
        con.rpush::<_, _, ()>(&key, &value).await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn redis_list_remove(id: String, key: String, value: String, count: isize, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.lrem::<_, _, ()>(&key, count, &value).await.map_err(|e| e.to_string())
}

// === Set commands ===

#[tauri::command]
pub async fn redis_set_add(id: String, key: String, member: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.sadd::<_, _, ()>(&key, &member).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn redis_set_remove(id: String, key: String, member: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.srem::<_, _, ()>(&key, &member).await.map_err(|e| e.to_string())
}

// === ZSet commands ===

#[tauri::command]
pub async fn redis_zset_add(id: String, key: String, member: String, score: f64, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.zadd::<_, _, _, ()>(&key, &member, score).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn redis_zset_remove(id: String, key: String, member: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    con.zrem::<_, _, ()>(&key, &member).await.map_err(|e| e.to_string())
}
