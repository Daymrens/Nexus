use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{Mutex, oneshot};

// ── JSON-RPC Types ──

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: u64,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcError {
    code: i64,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<serde_json::Value>,
}

// ── MCP Types ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    #[serde(rename = "inputSchema")]
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    pub command: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default = "default_stdio")]
    pub transport: String,
    pub url: Option<String>,
}

fn default_stdio() -> String {
    "stdio".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerStatus {
    pub id: String,
    pub status: String,
    pub tools: Vec<McpTool>,
    pub error: Option<String>,
}

// ── Managed Server ──

struct ManagedServer {
    config: McpServerConfig,
    child: Option<Child>,
    stdin: Option<tokio::process::ChildStdin>,
    tools: Vec<McpTool>,
    next_id: Arc<AtomicU64>,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Result<serde_json::Value, String>>>>>,
    logs: Vec<String>,
}

impl ManagedServer {
    fn new(config: McpServerConfig) -> Self {
        Self {
            config,
            child: None,
            stdin: None,
            tools: Vec::new(),
            next_id: Arc::new(AtomicU64::new(1)),
            pending: Arc::new(Mutex::new(HashMap::new())),
            logs: Vec::new(),
        }
    }

    async fn start(&mut self) -> Result<(), String> {
        let program = self.config.command.first().ok_or("No command provided")?;
        let args = &self.config.command[1..];

        let mut cmd = Command::new(program);
        cmd.args(args);
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());
        cmd.stdin(std::process::Stdio::piped());

        for (key, value) in &self.config.env {
            cmd.env(key, value);
        }

        let mut child = cmd.spawn().map_err(|e| {
            let msg = format!("Failed to spawn {}: {}", program, e);
            self.logs.push(msg.clone());
            msg
        })?;

        let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

        self.stdin = Some(stdin);
        self.child = Some(child);

        // Read stdout in background (JSON-RPC responses)
        let pending = self.pending.clone();
        let logs = Arc::new(Mutex::new(Vec::new()));
        let logs_clone = logs.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            let mut buf = String::new();
            loop {
                buf.clear();
                match reader.read_line(&mut buf).await {
                    Ok(0) => break,
                    Ok(_) => {
                        let line = buf.trim_end_matches('\n').to_string();
                        if let Ok(resp) = serde_json::from_str::<JsonRpcResponse>(&line) {
                            if let Some(id) = resp.id {
                                let mut pending = pending.lock().await;
                                if let Some(tx) = pending.remove(&id) {
                                    let value = if let Some(error) = resp.error {
                                        Err(format!("MCP error {}: {}", error.code, error.message))
                                    } else {
                                        Ok(resp.result.unwrap_or(serde_json::Value::Null))
                                    };
                                    let _ = tx.send(value);
                                }
                            }
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        // Read stderr in background (logs)
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr);
            let mut buf = String::new();
            loop {
                buf.clear();
                match reader.read_line(&mut buf).await {
                    Ok(0) => break,
                    Ok(_) => {
                        let mut logs = logs_clone.lock().await;
                        logs.push(buf.trim_end_matches('\n').to_string());
                    }
                    Err(_) => break,
                }
            }
        });

        // Initialize the MCP connection
        self.initialize().await?;

        Ok(())
    }

    async fn initialize(&mut self) -> Result<(), String> {
        let _result = self
            .send_request("initialize", Some(serde_json::json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "nexus",
                    "version": "0.1.0"
                }
            })))
            .await?;

        // Send initialized notification
        self.send_notification("notifications/initialized").await?;

        // List tools
        let tools_result = self.send_request("tools/list", None).await?;
        if let Some(tools_value) = tools_result.get("tools") {
            if let Ok(tools) = serde_json::from_value::<Vec<McpTool>>(tools_value.clone()) {
                self.tools = tools;
            }
        }

        Ok(())
    }

    async fn send_request(
        &mut self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id,
            method: method.to_string(),
            params,
        };

        let (tx, rx) = oneshot::channel();
        {
            let mut pending = self.pending.lock().await;
            pending.insert(id, tx);
        }

        let stdin = self.stdin.as_mut().ok_or("Server not connected")?;
        let mut msg = serde_json::to_string(&request).map_err(|e| e.to_string())?;
        msg.push('\n');
        stdin
            .write_all(msg.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        stdin.flush().await.map_err(|e| e.to_string())?;

        tokio::time::timeout(std::time::Duration::from_secs(30), rx)
            .await
            .map_err(|_| "Request timed out".to_string())?
            .map_err(|_| "Channel closed".to_string())?
    }

    async fn send_notification(&mut self, method: &str) -> Result<(), String> {
        let notification = serde_json::json!({
            "jsonrpc": "2.0",
            "method": method,
        });
        let stdin = self.stdin.as_mut().ok_or("Server not connected")?;
        let mut msg =
            serde_json::to_string(&notification).map_err(|e| e.to_string())?;
        msg.push('\n');
        stdin
            .write_all(msg.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        stdin.flush().await.map_err(|e| e.to_string())?;
        Ok(())
    }

    async fn call_tool(
        &mut self,
        name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        self.send_request(
            "tools/call",
            Some(serde_json::json!({
                "name": name,
                "arguments": arguments
            })),
        )
        .await
    }

    async fn stop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill().await;
        }
        self.stdin = None;
        self.tools.clear();
        let mut pending = self.pending.lock().await;
        pending.clear();
    }
}

// ── Global State ──

pub struct McpManager {
    servers: Arc<Mutex<HashMap<String, ManagedServer>>>,
}

impl McpManager {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn add_server(&self, config: McpServerConfig) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        if servers.contains_key(&config.id) {
            return Err(format!("Server {} already exists", config.id));
        }
        servers.insert(config.id.clone(), ManagedServer::new(config));
        Ok(())
    }

    pub async fn remove_server(&self, id: &str) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        if let Some(mut server) = servers.remove(id) {
            server.stop().await;
        }
        Ok(())
    }

    pub async fn start_server(&self, id: &str) -> Result<Vec<McpTool>, String> {
        let mut servers = self.servers.lock().await;
        let server = servers
            .get_mut(id)
            .ok_or_else(|| format!("Server {} not found", id))?;
        server.start().await?;
        Ok(server.tools.clone())
    }

    pub async fn stop_server(&self, id: &str) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        let server = servers
            .get_mut(id)
            .ok_or_else(|| format!("Server {} not found", id))?;
        server.stop().await;
        Ok(())
    }

    pub async fn call_tool(
        &self,
        id: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        let mut servers = self.servers.lock().await;
        let server = servers
            .get_mut(id)
            .ok_or_else(|| format!("Server {} not found", id))?;
        server.call_tool(tool_name, arguments).await
    }

    pub async fn list_tools(&self, id: &str) -> Result<Vec<McpTool>, String> {
        let servers = self.servers.lock().await;
        let server = servers
            .get(id)
            .ok_or_else(|| format!("Server {} not found", id))?;
        Ok(server.tools.clone())
    }

    pub async fn get_status(&self, id: &str) -> Result<McpServerStatus, String> {
        let servers = self.servers.lock().await;
        let server = servers
            .get(id)
            .ok_or_else(|| format!("Server {} not found", id))?;
        Ok(McpServerStatus {
            id: id.to_string(),
            status: if server.child.is_some() {
                "running".to_string()
            } else {
                "stopped".to_string()
            },
            tools: server.tools.clone(),
            error: None,
        })
    }
}

// ── Tauri Commands ──

#[tauri::command]
async fn mcp_add_server(
    config: McpServerConfig,
    state: tauri::State<'_, McpManager>,
) -> Result<(), String> {
    state.add_server(config).await
}

#[tauri::command]
async fn mcp_remove_server(
    id: String,
    state: tauri::State<'_, McpManager>,
) -> Result<(), String> {
    state.remove_server(&id).await
}

#[tauri::command]
async fn mcp_start_server(
    id: String,
    state: tauri::State<'_, McpManager>,
) -> Result<Vec<McpTool>, String> {
    state.start_server(&id).await
}

#[tauri::command]
async fn mcp_stop_server(
    id: String,
    state: tauri::State<'_, McpManager>,
) -> Result<(), String> {
    state.stop_server(&id).await
}

#[tauri::command]
async fn mcp_call_tool(
    id: String,
    tool_name: String,
    arguments: serde_json::Value,
    state: tauri::State<'_, McpManager>,
) -> Result<serde_json::Value, String> {
    state.call_tool(&id, &tool_name, arguments).await
}

#[tauri::command]
async fn mcp_list_tools(
    id: String,
    state: tauri::State<'_, McpManager>,
) -> Result<Vec<McpTool>, String> {
    state.list_tools(&id).await
}

#[tauri::command]
async fn mcp_get_status(
    id: String,
    state: tauri::State<'_, McpManager>,
) -> Result<McpServerStatus, String> {
    state.get_status(&id).await
}

// ── File Commands ──

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

// ── App Setup ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(McpManager::new())
        .invoke_handler(tauri::generate_handler![
            mcp_add_server,
            mcp_remove_server,
            mcp_start_server,
            mcp_stop_server,
            mcp_call_tool,
            mcp_list_tools,
            mcp_get_status,
            read_file,
            write_file,
            list_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nexus");
}
