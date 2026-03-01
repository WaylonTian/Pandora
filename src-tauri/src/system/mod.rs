use serde::Serialize;
use std::net::UdpSocket;

#[derive(Debug, Serialize, Clone)]
pub struct IpInfo {
    pub local_ips: Vec<String>,
    pub public_ip: Option<String>,
}

pub fn get_local_ips() -> Vec<String> {
    let mut ips = Vec::new();
    // Use UDP socket trick to find local IP
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                ips.push(addr.ip().to_string());
            }
        }
    }
    if ips.is_empty() {
        ips.push("127.0.0.1".to_string());
    }
    ips
}

pub async fn get_public_ip() -> Option<String> {
    let client = reqwest::Client::new();
    if let Ok(resp) = client.get("https://api.ipify.org").send().await {
        if let Ok(text) = resp.text().await {
            return Some(text.trim().to_string());
        }
    }
    None
}

pub fn get_hosts_path() -> String {
    // Windows hosts file path
    "C:\\Windows\\System32\\drivers\\etc\\hosts".to_string()
}

pub fn read_hosts() -> Result<String, String> {
    std::fs::read_to_string(get_hosts_path()).map_err(|e| format!("Failed to read hosts: {}", e))
}

pub fn write_hosts(content: &str) -> Result<(), String> {
    std::fs::write(get_hosts_path(), content).map_err(|e| format!("Failed to write hosts: {}. Try running as administrator.", e))
}