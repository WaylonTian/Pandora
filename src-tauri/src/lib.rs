mod http;
mod db;
mod script;
mod system;
mod storage;
mod plugin;

use storage::{AppDatabase, Collection, ApiRequest, Environment, Variable, HistoryItem, Cookie};
use db::commands::DbState;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::State;

pub struct AppState {
    pub db: Mutex<AppDatabase>,
    pub db_state: DbState,
    pub processes: script::ProcessMap,
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

// Cookie commands
#[tauri::command]
fn get_cookies(state: State<AppState>, domain: Option<String>) -> Result<Vec<Cookie>, String> {
    state.db.lock().unwrap().get_cookies(domain.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_cookie(state: State<AppState>, cookie: Cookie) -> Result<(), String> {
    state.db.lock().unwrap().set_cookie(&cookie).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_cookie(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.lock().unwrap().delete_cookie(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_domain_cookies(state: State<AppState>, domain: String) -> Result<(), String> {
    state.db.lock().unwrap().clear_domain_cookies(&domain).map_err(|e| e.to_string())
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
    args_mode: Option<String>,
    args_json: Option<String>,
    working_dir: Option<String>,
    env: HashMap<String, String>,
) -> Result<script::ScriptOutput, String> {
    script::execute_script(&runtime, &script_path, args, args_mode, args_json, working_dir, env).await
}

#[tauri::command]
async fn list_runtimes() -> Result<Vec<script::RuntimeInfo>, String> {
    Ok(script::detect_runtimes().await)
}

#[tauri::command]
fn get_scripts_dir() -> String {
    script::get_default_scripts_dir()
}

#[tauri::command]
fn list_script_files(dir: String) -> Result<Vec<script::FileEntry>, String> {
    script::list_script_files(&dir)
}

#[tauri::command]
fn read_script_file(path: String) -> Result<String, String> {
    script::read_script_file(&path)
}

#[tauri::command]
fn write_script_file(path: String, content: String) -> Result<(), String> {
    script::write_script_file(&path, &content)
}

#[tauri::command]
fn create_script_file(dir: String, name: String) -> Result<String, String> {
    script::create_script_file(&dir, &name)
}

#[tauri::command]
fn delete_script_file(path: String) -> Result<(), String> {
    script::delete_script_file(&path)
}

#[tauri::command]
fn rename_script_file(old_path: String, new_path: String) -> Result<(), String> {
    script::rename_script_file(&old_path, &new_path)
}

#[tauri::command]
fn create_script_folder(path: String) -> Result<(), String> {
    script::create_script_folder(&path)
}

#[tauri::command]
fn read_script_meta(dir: String) -> Result<script::ScriptMeta, String> {
    script::read_script_meta(&dir)
}

#[tauri::command]
fn write_script_meta(dir: String, meta: script::ScriptMeta) -> Result<(), String> {
    script::write_script_meta(&dir, &meta)
}

#[tauri::command]
async fn start_script(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    runtime: String,
    script_path: String,
    args: Vec<String>,
    args_mode: Option<String>,
    args_json: Option<String>,
    working_dir: Option<String>,
    env: HashMap<String, String>,
) -> Result<u32, String> {
    script::start_script(app, state.processes.clone(), &runtime, &script_path, args, args_mode, args_json, working_dir, env).await
}

#[tauri::command]
async fn kill_script(state: State<'_, AppState>, pid: u32) -> Result<(), String> {
    script::kill_script(state.processes.clone(), pid).await
}

// System commands
#[tauri::command]
fn get_local_ips() -> Vec<String> {
    system::get_local_ips()
}

#[tauri::command]
async fn get_public_ip() -> Result<Option<String>, String> {
    Ok(system::get_public_ip().await)
}

#[tauri::command]
fn read_hosts_file() -> Result<String, String> {
    system::read_hosts()
}

#[tauri::command]
fn write_hosts_file(content: String) -> Result<(), String> {
    system::write_hosts(&content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = AppDatabase::new().expect("Failed to initialize database");

    // Start local HTTP server for plugin files
    plugin::server::start_server(plugin::manager::plugins_dir());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { 
            db: Mutex::new(db),
            db_state: DbState::new(),
            processes: script::new_process_map(),
        })
        .invoke_handler(tauri::generate_handler![
            get_collections, create_collection, delete_collection, rename_collection,
            get_requests, save_request, delete_request,
            get_environments, create_environment, set_active_environment, delete_environment,
            get_variables, save_variable, delete_variable,
            get_history, clear_history,
            get_cookies, set_cookie, delete_cookie, clear_domain_cookies,
            send_http_request,
            run_script, list_runtimes,
            get_scripts_dir, list_script_files, read_script_file, write_script_file,
            create_script_file, delete_script_file, rename_script_file, create_script_folder,
            read_script_meta, write_script_meta, start_script, kill_script,
            get_local_ips, get_public_ip, read_hosts_file, write_hosts_file,
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
            db::commands::get_table_stats,
            db::commands::list_views,
            db::commands::list_functions,
            db::commands::list_procedures,
            db::commands::list_triggers,
            db::commands::cancel_query,
            plugin::commands::plugin_list,
            plugin::commands::plugin_get,
            plugin::commands::plugin_uninstall,
            plugin::commands::plugin_toggle,
            plugin::commands::plugin_install_from_market,
            plugin::commands::plugin_install_from_file,
            plugin::commands::plugin_db_put,
            plugin::commands::plugin_db_get,
            plugin::commands::plugin_db_remove,
            plugin::commands::plugin_db_all,
            plugin::commands::plugin_db_put_attachment,
            plugin::commands::plugin_db_get_attachment,
            plugin::commands::marketplace_search,
            plugin::commands::marketplace_topic,
            plugin::commands::marketplace_detail,
            plugin::commands::plugin_read_file,
            plugin::commands::plugin_write_shim,
            plugin::commands::plugin_server_port,
            plugin::commands::plugin_get_path,
            plugin::commands::plugin_shell_show_item,
            plugin::commands::plugin_show_open_dialog,
            plugin::commands::plugin_screen_capture,
            plugin::commands::plugin_show_save_dialog,
            plugin::commands::plugin_shell_trash_item,
            plugin::commands::plugin_shell_beep,
            plugin::commands::plugin_get_native_id,
            plugin::commands::plugin_get_app_name,
            plugin::commands::plugin_is_dev,
            plugin::commands::plugin_get_file_icon,
            plugin::commands::plugin_get_copyed_files,
            plugin::commands::plugin_paste_file,
            plugin::commands::plugin_paste_image,
            plugin::commands::plugin_simulate_keyboard_tap,
            plugin::commands::plugin_simulate_mouse_move,
            plugin::commands::plugin_simulate_mouse_click,
            plugin::commands::plugin_simulate_mouse_double_click,
            plugin::commands::plugin_simulate_mouse_right_click,
            plugin::commands::plugin_get_primary_display,
            plugin::commands::plugin_get_all_displays,
            plugin::commands::plugin_get_cursor_screen_point,
            plugin::commands::plugin_screen_color_pick,
            plugin::commands::plugin_get_display_nearest_point,
            plugin::commands::plugin_screen_to_dip_point,
            plugin::commands::plugin_dip_to_screen_point,
            plugin::commands::sharp_metadata,
            plugin::commands::sharp_resize,
            plugin::commands::sharp_rotate,
            plugin::commands::sharp_flip,
            plugin::commands::sharp_crop,
            plugin::commands::sharp_blur,
            plugin::commands::sharp_grayscale,
            plugin::commands::sharp_to_format,
            plugin::commands::sharp_to_base64,
            plugin::commands::ffmpeg_is_available,
            plugin::commands::ffmpeg_run,
            plugin::commands::ffmpeg_probe,
            plugin::commands::ubrowser_run,
            plugin::node_bridge::node_fs_read_file,
            plugin::node_bridge::node_fs_write_file,
            plugin::node_bridge::node_fs_mkdir,
            plugin::node_bridge::node_fs_readdir,
            plugin::node_bridge::node_fs_unlink,
            plugin::node_bridge::node_os_homedir,
            plugin::node_bridge::node_os_tmpdir,
            plugin::node_bridge::node_exec,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}