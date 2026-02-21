use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ScriptOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
}

// Script executor - will be implemented in Task 7