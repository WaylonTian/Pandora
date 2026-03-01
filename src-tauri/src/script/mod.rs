use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex as TokioMutex;
use tauri::Emitter;

// ── Types ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScriptOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RuntimeInfo {
    pub name: String,
    pub command: String,
    pub available: bool,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ScriptMeta {
    pub scripts_dir: String,
    pub scripts: HashMap<String, ScriptConfig>,
    pub global_env: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ScriptConfig {
    pub last_args: Option<String>,
    pub args_mode: Option<String>,
    pub args_json: Option<String>,
    pub working_dir: Option<String>,
    pub env: HashMap<String, String>,
    pub runtime_override: Option<String>,
}

pub type ProcessMap = Arc<TokioMutex<HashMap<u32, tokio::process::Child>>>;

pub fn new_process_map() -> ProcessMap {
    Arc::new(TokioMutex::new(HashMap::new()))
}

// ── File Operations ──

pub fn get_default_scripts_dir() -> String {
    let home = dirs::home_dir().unwrap_or_default();
    home.join(".pandora").join("scripts").to_string_lossy().to_string()
}

pub fn list_script_files(dir: &str) -> Result<Vec<FileEntry>, String> {
    let path = std::path::Path::new(dir);
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
        return Ok(vec![]);
    }
    read_dir_recursive(path)
}

fn read_dir_recursive(dir: &std::path::Path) -> Result<Vec<FileEntry>, String> {
    let mut entries: Vec<FileEntry> = Vec::new();
    let rd = std::fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in rd {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        // Skip hidden files and metadata
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        let is_dir = path.is_dir();
        let extension = if is_dir {
            None
        } else {
            path.extension().map(|e| e.to_string_lossy().to_string())
        };
        let children = if is_dir {
            Some(read_dir_recursive(&path)?)
        } else {
            None
        };
        entries.push(FileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            extension,
            children,
        });
    }

    // Sort: dirs first, then alphabetical
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

pub fn read_script_file(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

pub fn write_script_file(path: &str, content: &str) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, content).map_err(|e| e.to_string())
}

pub fn create_script_file(dir: &str, name: &str) -> Result<String, String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = std::path::Path::new(dir).join(name);
    if path.exists() {
        return Err("File already exists".to_string());
    }
    std::fs::write(&path, "").map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

pub fn delete_script_file(path: &str) -> Result<(), String> {
    let p = std::path::Path::new(path);
    if p.is_dir() {
        std::fs::remove_dir_all(p)
    } else {
        std::fs::remove_file(p)
    }
    .map_err(|e| e.to_string())
}

pub fn rename_script_file(old: &str, new_path: &str) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(new_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::rename(old, new_path).map_err(|e| e.to_string())
}

pub fn create_script_folder(path: &str) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|e| e.to_string())
}

// ── Metadata ──

pub fn read_script_meta(dir: &str) -> Result<ScriptMeta, String> {
    let meta_path = std::path::Path::new(dir).join(".pandora-scripts.json");
    if !meta_path.exists() {
        return Ok(ScriptMeta {
            scripts_dir: dir.to_string(),
            ..Default::default()
        });
    }
    let content = std::fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn write_script_meta(dir: &str, meta: &ScriptMeta) -> Result<(), String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let meta_path = std::path::Path::new(dir).join(".pandora-scripts.json");
    let content = serde_json::to_string_pretty(meta).map_err(|e| e.to_string())?;
    std::fs::write(meta_path, content).map_err(|e| e.to_string())
}

// ── Script Execution ──

pub async fn execute_script(
    runtime: &str,
    script_path: &str,
    args: Vec<String>,
    args_mode: Option<String>,
    args_json: Option<String>,
    working_dir: Option<String>,
    env: HashMap<String, String>,
) -> Result<ScriptOutput, String> {
    let (final_args, stdin_data, temp_file) = build_args(args, args_mode, args_json)?;
    let (cmd, cmd_args) = resolve_runtime(runtime, script_path, &final_args)?;

    let mut command = Command::new(&cmd);
    command.args(&cmd_args);
    command.envs(&env);

    let effective_dir = working_dir.or_else(|| {
        std::path::Path::new(script_path).parent().map(|p| p.to_string_lossy().to_string())
    });
    if let Some(dir) = effective_dir {
        command.current_dir(dir);
    }

    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());
    if stdin_data.is_some() {
        command.stdin(std::process::Stdio::piped());
    }

    let start = Instant::now();

    if let Some(data) = stdin_data {
        let mut child = command.spawn().map_err(|e| format!("Failed to execute: {}", e))?;
        if let Some(mut stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            let _ = stdin.write_all(data.as_bytes()).await;
            drop(stdin);
        }
        let output = child.wait_with_output().await.map_err(|e| format!("Failed to execute: {}", e))?;
        let duration_ms = start.elapsed().as_millis() as u64;
        if let Some(tmp) = temp_file { let _ = std::fs::remove_file(tmp); }
        Ok(ScriptOutput {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code(),
            duration_ms,
        })
    } else {
        let output = command.output().await.map_err(|e| format!("Failed to execute: {}", e))?;
        let duration_ms = start.elapsed().as_millis() as u64;
        if let Some(tmp) = temp_file { let _ = std::fs::remove_file(tmp); }
        Ok(ScriptOutput {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code(),
            duration_ms,
        })
    }
}

fn build_args(
    args: Vec<String>,
    args_mode: Option<String>,
    args_json: Option<String>,
) -> Result<(Vec<String>, Option<String>, Option<std::path::PathBuf>), String> {
    match args_mode.as_deref().unwrap_or("json") {
        "json" => {
            let json = args_json.unwrap_or_default();
            Ok((args, if json.is_empty() { None } else { Some(json) }, None))
        }
        _ => Ok((args, None, None)),
    }
}

pub async fn start_script(
    app: tauri::AppHandle,
    processes: ProcessMap,
    runtime: &str,
    script_path: &str,
    args: Vec<String>,
    args_mode: Option<String>,
    args_json: Option<String>,
    working_dir: Option<String>,
    env: HashMap<String, String>,
) -> Result<u32, String> {
    let (final_args, stdin_data, temp_file) = build_args(args, args_mode, args_json)?;
    let (cmd, cmd_args) = resolve_runtime(runtime, script_path, &final_args)?;

    let mut command = Command::new(&cmd);
    command.args(&cmd_args);
    command.envs(&env);

    let effective_dir = working_dir.or_else(|| {
        std::path::Path::new(script_path).parent().map(|p| p.to_string_lossy().to_string())
    });
    if let Some(dir) = &effective_dir {
        command.current_dir(dir);
    }

    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());
    if stdin_data.is_some() {
        command.stdin(std::process::Stdio::piped());
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to spawn: {}", e))?;

    // Write stdin data if in stdin mode
    if let Some(data) = stdin_data {
        if let Some(mut stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            let _ = stdin.write_all(data.as_bytes()).await;
            drop(stdin);
        }
    }

    let pid = child.id().unwrap_or(0);

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // Store child for kill support
    processes.lock().await.insert(pid, child);

    let start = Instant::now();

    // Stream stdout
    if let Some(out) = stdout {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(out).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app_clone.emit(
                    "script-stdout",
                    serde_json::json!({"pid": pid, "line": line}),
                );
            }
        });
    }

    // Stream stderr
    if let Some(err) = stderr {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(err).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app_clone.emit(
                    "script-stderr",
                    serde_json::json!({"pid": pid, "line": line}),
                );
            }
        });
    }

    // Wait for exit
    let processes_clone = processes.clone();
    tokio::spawn(async move {
        let exit_code = if let Some(mut child) = processes_clone.lock().await.remove(&pid) {
            match child.wait().await {
                Ok(status) => status.code(),
                Err(_) => Some(-1),
            }
        } else {
            Some(-1)
        };
        let duration_ms = start.elapsed().as_millis() as u64;
        let _ = app.emit(
            "script-exit",
            serde_json::json!({"pid": pid, "exit_code": exit_code, "duration_ms": duration_ms}),
        );
        // Clean up temp file if created for "file" args mode
        if let Some(tmp) = temp_file {
            let _ = std::fs::remove_file(tmp);
        }
    });

    Ok(pid)
}

pub async fn kill_script(processes: ProcessMap, pid: u32) -> Result<(), String> {
    let mut map = processes.lock().await;
    if let Some(mut child) = map.remove(&pid) {
        child.kill().await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Runtime Detection ──

fn resolve_runtime(
    runtime: &str,
    script_path: &str,
    args: &[String],
) -> Result<(String, Vec<String>), String> {
    let mut cmd_args: Vec<String> = Vec::new();

    let cmd = match runtime.to_lowercase().as_str() {
        "node" | "nodejs" | "javascript" | "js" => {
            cmd_args.push(script_path.to_string());
            cmd_args.extend_from_slice(args);
            "node".to_string()
        }
        "python" | "python3" | "py" => {
            cmd_args.push(script_path.to_string());
            cmd_args.extend_from_slice(args);
            "python".to_string()
        }
        "bash" | "sh" => {
            cmd_args.push(script_path.to_string());
            cmd_args.extend_from_slice(args);
            "bash".to_string()
        }
        "powershell" | "pwsh" | "ps1" => {
            cmd_args.push("-ExecutionPolicy".to_string());
            cmd_args.push("Bypass".to_string());
            cmd_args.push("-File".to_string());
            cmd_args.push(script_path.to_string());
            cmd_args.extend_from_slice(args);
            "powershell".to_string()
        }
        "cmd" | "bat" => {
            cmd_args.push("/c".to_string());
            cmd_args.push(script_path.to_string());
            cmd_args.extend_from_slice(args);
            "cmd".to_string()
        }
        other => {
            cmd_args.push(script_path.to_string());
            cmd_args.extend_from_slice(args);
            other.to_string()
        }
    };

    Ok((cmd, cmd_args))
}

pub async fn detect_runtimes() -> Vec<RuntimeInfo> {
    let runtimes = vec![
        ("Node.js", "node", "--version"),
        ("Python", "python", "--version"),
        (
            "PowerShell",
            "powershell",
            "-Command $PSVersionTable.PSVersion.ToString()",
        ),
        ("Bash", "bash", "--version"),
    ];

    let mut results = Vec::new();

    for (name, cmd, version_arg) in runtimes {
        let version_args: Vec<&str> = version_arg.split_whitespace().collect();
        let result = Command::new(cmd).args(&version_args).output().await;

        let (available, version) = match result {
            Ok(output) if output.status.success() => {
                let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let ver = if ver.is_empty() {
                    String::from_utf8_lossy(&output.stderr).trim().to_string()
                } else {
                    ver
                };
                (true, ver)
            }
            _ => (false, String::new()),
        };

        results.push(RuntimeInfo {
            name: name.to_string(),
            command: cmd.to_string(),
            available,
            version,
        });
    }

    results
}
