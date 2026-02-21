use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::process::Command;

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

pub async fn execute_script(
    runtime: &str,
    script_path: &str,
    args: Vec<String>,
    working_dir: Option<String>,
) -> Result<ScriptOutput, String> {
    let (cmd, cmd_args) = resolve_runtime(runtime, script_path, &args)?;

    let mut command = Command::new(&cmd);
    command.args(&cmd_args);

    if let Some(dir) = working_dir {
        command.current_dir(dir);
    }

    // Capture output
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    let start = Instant::now();
    let output = command.output().await.map_err(|e| format!("Failed to execute: {}", e))?;
    let duration_ms = start.elapsed().as_millis() as u64;

    Ok(ScriptOutput {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
        duration_ms,
    })
}

fn resolve_runtime(runtime: &str, script_path: &str, args: &[String]) -> Result<(String, Vec<String>), String> {
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
            // Custom runtime: treat as command name directly
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
        ("PowerShell", "powershell", "-Command $PSVersionTable.PSVersion.ToString()"),
        ("Bash", "bash", "--version"),
    ];

    let mut results = Vec::new();

    for (name, cmd, version_arg) in runtimes {
        let version_args: Vec<&str> = version_arg.split_whitespace().collect();
        let result = Command::new(cmd)
            .args(&version_args)
            .output()
            .await;

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