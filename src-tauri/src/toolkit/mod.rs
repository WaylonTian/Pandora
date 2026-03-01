use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone)]
pub struct PortInfo {
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
    pub protocol: String,
}

#[derive(Serialize, Clone)]
pub struct EnvVar {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub fn toolkit_list_ports() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<PortInfo> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in text.lines().skip(4) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 { continue; }
        let state = parts.get(3).unwrap_or(&"");
        if *state != "LISTENING" { continue; }
        let proto = parts[0].to_string();
        let addr = parts[1];
        let port_str = addr.rsplit(':').next().unwrap_or("0");
        let port: u16 = port_str.parse().unwrap_or(0);
        if port == 0 { continue; }
        let pid: u32 = parts[4].parse().unwrap_or(0);
        if !seen.insert((port, pid)) { continue; }

        let process_name = if pid > 0 {
            get_process_name(pid)
        } else {
            "System".to_string()
        };

        ports.push(PortInfo { port, pid, process_name, protocol: proto });
    }
    ports.sort_by_key(|p| p.port);
    Ok(ports)
}

fn get_process_name(pid: u32) -> String {
    let output = Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
        .output();
    match output {
        Ok(o) => {
            let text = String::from_utf8_lossy(&o.stdout);
            text.split(',').next().unwrap_or("").trim_matches('"').to_string()
        }
        Err(_) => format!("PID:{}", pid),
    }
}

#[tauri::command]
pub fn toolkit_kill_process(pid: u32) -> Result<(), String> {
    Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toolkit_get_env_vars() -> Vec<EnvVar> {
    let mut vars: Vec<EnvVar> = std::env::vars()
        .map(|(key, value)| EnvVar { key, value })
        .collect();
    vars.sort_by(|a, b| a.key.to_lowercase().cmp(&b.key.to_lowercase()));
    vars
}
