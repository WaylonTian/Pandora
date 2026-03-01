use redis::aio::MultiplexedConnection;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::types::RedisConnectionConfig;

fn build_url(config: &RedisConnectionConfig) -> String {
    match &config.password {
        Some(pw) if !pw.is_empty() => format!("redis://:{}@{}:{}/{}", pw, config.host, config.port, config.database),
        _ => format!("redis://{}:{}/{}", config.host, config.port, config.database),
    }
}

pub struct RedisState {
    connections: Arc<RwLock<HashMap<String, MultiplexedConnection>>>,
}

impl RedisState {
    pub fn new() -> Self {
        Self { connections: Arc::new(RwLock::new(HashMap::new())) }
    }

    pub async fn test_connection(config: &RedisConnectionConfig) -> Result<(), String> {
        let client = redis::Client::open(build_url(config)).map_err(|e| e.to_string())?;
        let mut con = client.get_multiplexed_tokio_connection().await.map_err(|e| e.to_string())?;
        redis::cmd("PING").query_async::<String>(&mut con).await.map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn connect(&self, id: &str, config: &RedisConnectionConfig) -> Result<(), String> {
        let client = redis::Client::open(build_url(config)).map_err(|e| e.to_string())?;
        let con = client.get_multiplexed_tokio_connection().await.map_err(|e| e.to_string())?;
        self.connections.write().await.insert(id.to_string(), con);
        Ok(())
    }

    pub async fn disconnect(&self, id: &str) {
        self.connections.write().await.remove(id);
    }

    pub async fn get_connection(&self, id: &str) -> Result<MultiplexedConnection, String> {
        self.connections.read().await.get(id).cloned()
            .ok_or_else(|| format!("Connection '{}' not found", id))
    }
}
