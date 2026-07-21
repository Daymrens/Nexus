use serde::{Deserialize, Serialize};

// ── MCP Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub command: Vec<String>,
    pub env: std::collections::HashMap<String, String>,
    pub transport: String,
    pub url: Option<String>,
}

// ── Tauri Commands ──

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Nexus.", name)
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<String>, String> {
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map_err(|e| e.to_string())?.is_dir();
        result.push(if is_dir {
            format!("{}/", name)
        } else {
            name
        });
    }
    result.sort();
    Ok(result)
}

#[tauri::command]
async fn spawn_process(command: String, args: Vec<String>) -> Result<u32, String> {
    use std::process::Command;
    let mut cmd = Command::new(&command);
    cmd.args(&args);
    let child = cmd.spawn().map_err(|e| e.to_string())?;
    Ok(child.id())
}

// ── App Setup ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            list_directory,
            spawn_process,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nexus");
}
