mod http;
mod db;
mod script;
mod system;
mod storage;

use storage::{AppDatabase, Collection, ApiRequest, Environment, Variable, HistoryItem};
use db::commands::DbState;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::State;

pub struct AppState {
    pub db: Mutex<AppDatabase>,
    pub db_state: DbState,
}

// Collection commands
#[tauri::command]
fn get_collections(state: State<AppState>) -> Result<Vec<Collection>, String> {
    state.db.lock().unwrap().get_collections().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_collection(state: State<AppState>, name: String, parent_id: Option<i64>) -> Result<i64, String> {
    state.db.lock().unwrap().create_collection(&name, parent_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_collection(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap().delete_collection(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_collection(state: State<AppState>, id: i64, name: String) -> Result<(), String> {
    state.db.lock().unwrap().rename_collection(id, &name).map_err(|e| e.to_string())
}

// Request commands
#[tauri::command]
fn get_requests(state: State<AppState>, collection_id: Option<i64>) -> Result<Vec<ApiRequest>, String> {
    state.db.lock().unwrap().get_requests(collection_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_request(state: State<AppState>, request: ApiRequest) -> Result<i64, String> {
    state.db.lock().unwrap().save_request(&request).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_request(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap().delete_request(id).map_err(|e| e.to_string())
}

// Environment commands
#[tauri::command]
fn get_environments(state: State<AppState>) -> Result<Vec<Environment>, String> {
    state.db.lock().unwrap().get_environments().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_environment(state: State<AppState>, name: String) -> Result<i64, String> {
    state.db.lock().unwrap().create_environment(&name).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_active_environment(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap().set_active_environment(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_environment(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap().delete_environment(id).map_err(|e| e.to_string())
}

// Variable commands
#[tauri::command]
fn get_variables(state: State<AppState>, environment_id: i64) -> Result<Vec<Variable>, String> {
    state.db.lock().unwrap().get_variables(environment_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_variable(state: State<AppState>, variable: Variable) -> Result<i64, String> {
    state.db.lock().unwrap().save_variable(&variable).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_variable(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap().delete_variable(id).map_err(|e| e.to_string())
}

// History commands
#[tauri::command]
fn get_history(state: State<AppState>) -> Result<Vec<HistoryItem>, String> {
    state.db.lock().unwrap().get_history().map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_history(state: State<AppState>) -> Result<(), String> {
    state.db.lock().unwrap().clear_history().map_err(|e| e.to_string())
}

// HTTP command
#[tauri::command]
async fn send_http_request(
    state: State<'_, AppState>,
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<http::HttpResponse, String> {
    let response = http::send_request(&method, &url, headers, body).await?;
    let _ = state.db.lock().unwrap().add_history(&method, &url, response.status as i32, response.time as i64);
    Ok(response)
}

// Script commands
#[tauri::command]
async fn run_script(
    runtime: String,
    script_path: String,
    args: Vec<String>,
    working_dir: Option<String>,
) -> Result<script::ScriptOutput, String> {
    script::execute_script(&runtime, &script_path, args, working_dir).await
}

#[tauri::command]
async fn list_runtimes() -> Result<Vec<script::RuntimeInfo>, String> {
    Ok(script::detect_runtimes().await)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = AppDatabase::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { 
            db: Mutex::new(db),
            db_state: DbState::new(),
        })
        .invoke_handler(tauri::generate_handler![
            get_collections, create_collection, delete_collection, rename_collection,
            get_requests, save_request, delete_request,
            get_environments, create_environment, set_active_environment, delete_environment,
            get_variables, save_variable, delete_variable,
            get_history, clear_history,
            send_http_request,
            run_script, list_runtimes,
            db::commands::create_connection,
            db::commands::test_connection,
            db::commands::connect,
            db::commands::disconnect,
            db::commands::execute_query,
            db::commands::execute_batch,
            db::commands::list_databases,
            db::commands::list_tables,
            db::commands::get_table_info,
            db::commands::get_table_ddl,
            db::commands::save_connection_config,
            db::commands::load_connection_configs,
            db::commands::delete_connection_config,
            db::commands::save_favorite,
            db::commands::load_favorites,
            db::commands::delete_favorite,
            db::commands::explain_query,
            db::commands::batch_import,
            db::commands::get_table_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}