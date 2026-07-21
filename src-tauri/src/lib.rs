mod ai;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tauri::Emitter;
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

// ── Chat Commands ──

#[tauri::command]
async fn chat_send(
    request: ai::ChatRequest,
    conversation_id: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    ai::stream_chat(request, app, conversation_id).await
}

// ── Terminal ──

struct TermSession {
    child: Child,
    stdin: Option<tokio::process::ChildStdin>,
}

pub struct TermManager {
    sessions: Arc<Mutex<HashMap<String, TermSession>>>,
}

impl TermManager {
    fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
async fn term_spawn(
    id: String,
    cwd: Option<String>,
    app: tauri::AppHandle,
    state: tauri::State<'_, TermManager>,
) -> Result<(), String> {
    let shell = if cfg!(windows) {
        "powershell.exe"
    } else {
        "bash"
    };
    let shell_args = if cfg!(windows) {
        vec!["-NoLogo", "-NoProfile"]
    } else {
        vec![]
    };

    let mut cmd = Command::new(shell);
    cmd.args(&shell_args);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    cmd.stdin(std::process::Stdio::piped());

    if let Some(ref dir) = cwd {
        cmd.current_dir(dir);
    }

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let mut sessions = state.sessions.lock().await;
    sessions.insert(
        id.clone(),
        TermSession {
            child,
            stdin: Some(stdin),
        },
    );
    drop(sessions);

    // Stream stdout
    let id_clone = id.clone();
    let app_out = app.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);
        let mut buf = [0u8; 8192];
        loop {
            match tokio::io::AsyncReadExt::read(&mut reader, &mut buf).await {
                Ok(0) => break,
                Ok(n) => {
                    let data = buf[..n].to_vec();
                    let _ = app_out.emit(
                        "term://output",
                        serde_json::json!({ "id": id_clone, "data": data }),
                    );
                }
                Err(_) => break,
            }
        }
    });

    // Stream stderr
    let id_clone = id.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr);
        let mut buf = [0u8; 8192];
        loop {
            match tokio::io::AsyncReadExt::read(&mut reader, &mut buf).await {
                Ok(0) => break,
                Ok(n) => {
                    let data = buf[..n].to_vec();
                    let _ = app.emit(
                        "term://output",
                        serde_json::json!({ "id": id_clone, "data": data }),
                    );
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn term_write(
    id: String,
    data: String,
    state: tauri::State<'_, TermManager>,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| format!("Terminal {} not found", id))?;
    let stdin = session.stdin.as_mut().ok_or("Terminal stdin closed")?;
    stdin
        .write_all(data.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    stdin.flush().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn term_kill(
    id: String,
    state: tauri::State<'_, TermManager>,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().await;
    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill().await;
    }
    Ok(())
}

// ── Agent Dashboard ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub id: String,
    pub name: String,
    pub role: String,
    pub task: String,
    pub command: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    pub role: String,
    pub task: String,
    pub status: String,
    pub logs: Vec<String>,
    pub pid: Option<u32>,
}

struct ManagedAgent {
    config: AgentConfig,
    child: Option<Child>,
    logs: Vec<String>,
}

pub struct AgentManager {
    agents: Arc<Mutex<HashMap<String, ManagedAgent>>>,
}

impl AgentManager {
    fn new() -> Self {
        Self {
            agents: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
async fn agent_spawn(
    config: AgentConfig,
    app: tauri::AppHandle,
    state: tauri::State<'_, AgentManager>,
) -> Result<(), String> {
    let program = config.command.first().ok_or("No command provided")?;
    let args = &config.command[1..];

    let mut cmd = Command::new(program);
    cmd.args(args);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    cmd.stdin(std::process::Stdio::piped());

    for (key, value) in &config.env {
        cmd.env(key, value);
    }

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn agent: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let agent_id = config.id.clone();
    let agents_arc = state.agents.clone();
    {
        let mut agents = agents_arc.lock().await;
        agents.insert(
            agent_id.clone(),
            ManagedAgent {
                config,
                child: Some(child),
                logs: Vec::new(),
            },
        );
    }

    // Stream stdout
    let id_out = agent_id.clone();
    let app_out = app.clone();
    let agents_out = agents_arc.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout);
        let mut buf = String::new();
        loop {
            buf.clear();
            match reader.read_line(&mut buf).await {
                Ok(0) => break,
                Ok(_) => {
                    let line = buf.trim_end().to_string();
                    {
                        let mut agents = agents_out.lock().await;
                        if let Some(agent) = agents.get_mut(&id_out) {
                            agent.logs.push(line.clone());
                            if agent.logs.len() > 500 {
                                agent.logs.drain(0..100);
                            }
                        }
                    }
                    let _ = app_out.emit(
                        "agent://log",
                        serde_json::json!({ "id": id_out, "line": line }),
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app_out.emit(
            "agent://status",
            serde_json::json!({ "id": id_out, "status": "stopped" }),
        );
    });

    // Stream stderr
    let id_err = agent_id.clone();
    let app_err = app.clone();
    let agents_err = agents_arc.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr);
        let mut buf = String::new();
        loop {
            buf.clear();
            match reader.read_line(&mut buf).await {
                Ok(0) => break,
                Ok(_) => {
                    let line = buf.trim_end().to_string();
                    {
                        let mut agents = agents_err.lock().await;
                        if let Some(agent) = agents.get_mut(&id_err) {
                            agent.logs.push(format!("[stderr] {}", line));
                        }
                    }
                    let _ = app_err.emit(
                        "agent://log",
                        serde_json::json!({ "id": id_err, "line": format!("[stderr] {}", line) }),
                    );
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn agent_kill(
    id: String,
    state: tauri::State<'_, AgentManager>,
) -> Result<(), String> {
    let mut agents = state.agents.lock().await;
    if let Some(mut agent) = agents.remove(&id) {
        if let Some(mut child) = agent.child.take() {
            let _ = child.kill().await;
        }
    }
    Ok(())
}

#[tauri::command]
async fn agent_list(
    state: tauri::State<'_, AgentManager>,
) -> Result<Vec<AgentInfo>, String> {
    let agents = state.agents.lock().await;
    Ok(agents
        .iter()
        .map(|(id, agent)| AgentInfo {
            id: id.clone(),
            name: agent.config.name.clone(),
            role: agent.config.role.clone(),
            task: agent.config.task.clone(),
            status: if agent.child.is_some() {
                "running".to_string()
            } else {
                "stopped".to_string()
            },
            logs: agent.logs.clone(),
            pid: agent.child.as_ref().and_then(|c| c.id()),
        })
        .collect())
}

#[tauri::command]
async fn agent_logs(
    id: String,
    state: tauri::State<'_, AgentManager>,
) -> Result<Vec<String>, String> {
    let agents = state.agents.lock().await;
    let agent = agents
        .get(&id)
        .ok_or_else(|| format!("Agent {} not found", id))?;
    Ok(agent.logs.clone())
}

// ── Memory Viewer ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: String,
    pub namespace: String,
    pub content: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total_entries: usize,
    pub namespaces: Vec<String>,
    pub total_size_bytes: usize,
}

fn memory_path() -> std::path::PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("nexus_memory.json")
}

fn load_memory() -> Vec<MemoryEntry> {
    let path = memory_path();
    if !path.exists() {
        return Vec::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_memory(entries: &[MemoryEntry]) -> Result<(), String> {
    let path = memory_path();
    let json = serde_json::to_string_pretty(entries).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
async fn memory_list(
    namespace: Option<String>,
    search: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<MemoryEntry>, String> {
    let entries = load_memory();
    let mut filtered: Vec<MemoryEntry> = entries
        .into_iter()
        .filter(|e| {
            if let Some(ref ns) = namespace {
                if &e.namespace != ns {
                    return false;
                }
            }
            if let Some(ref query) = search {
                let q = query.to_lowercase();
                if !e.content.to_lowercase().contains(&q)
                    && !e.tags.iter().any(|t| t.to_lowercase().contains(&q))
                    && !e.namespace.to_lowercase().contains(&q)
                {
                    return false;
                }
            }
            true
        })
        .collect();

    filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    let start = offset.unwrap_or(0);
    let count = limit.unwrap_or(100);
    filtered = filtered.into_iter().skip(start).take(count).collect();

    Ok(filtered)
}

#[tauri::command]
async fn memory_get(id: String) -> Result<MemoryEntry, String> {
    let entries = load_memory();
    entries
        .into_iter()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Memory entry {} not found", id))
}

#[tauri::command]
async fn memory_add(
    namespace: String,
    content: String,
    tags: Vec<String>,
    metadata: HashMap<String, String>,
) -> Result<MemoryEntry, String> {
    let mut entries = load_memory();
    let now = chrono_free_now();
    let entry = MemoryEntry {
        id: format!("mem-{}", now),
        namespace,
        content,
        tags,
        metadata,
        created_at: now.clone(),
        updated_at: now,
    };
    entries.push(entry.clone());
    save_memory(&entries)?;
    Ok(entry)
}

#[tauri::command]
async fn memory_update(
    id: String,
    content: Option<String>,
    tags: Option<Vec<String>>,
    metadata: Option<HashMap<String, String>>,
) -> Result<MemoryEntry, String> {
    let mut entries = load_memory();
    let entry = entries
        .iter_mut()
        .find(|e| e.id == id)
        .ok_or_else(|| format!("Memory entry {} not found", id))?;
    if let Some(c) = content {
        entry.content = c;
    }
    if let Some(t) = tags {
        entry.tags = t;
    }
    if let Some(m) = metadata {
        entry.metadata = m;
    }
    entry.updated_at = chrono_free_now();
    let result = entry.clone();
    save_memory(&entries)?;
    Ok(result)
}

#[tauri::command]
async fn memory_delete(id: String) -> Result<(), String> {
    let mut entries = load_memory();
    entries.retain(|e| e.id != id);
    save_memory(&entries)?;
    Ok(())
}

#[tauri::command]
async fn memory_stats() -> Result<MemoryStats, String> {
    let entries = load_memory();
    let namespaces: Vec<String> = entries
        .iter()
        .map(|e| e.namespace.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    let total_size = entries.iter().map(|e| e.content.len()).sum();
    Ok(MemoryStats {
        total_entries: entries.len(),
        namespaces,
        total_size_bytes: total_size,
    })
}

fn chrono_free_now() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis()
        .to_string()
}

// ── Plugin Marketplace ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: String,
    pub category: String,
    pub enabled: bool,
    pub installed: bool,
    #[serde(default)]
    pub config: HashMap<String, String>,
    pub downloaded_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginRegistryEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: String,
    pub category: String,
    pub downloads: u64,
    pub rating: f64,
}

fn plugins_path() -> std::path::PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("nexus_plugins.json")
}

fn load_installed_plugins() -> Vec<Plugin> {
    let path = plugins_path();
    if !path.exists() {
        return Vec::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_installed_plugins(plugins: &[Plugin]) -> Result<(), String> {
    let json = serde_json::to_string_pretty(plugins).map_err(|e| e.to_string())?;
    std::fs::write(&plugins_path(), json).map_err(|e| e.to_string())
}

fn builtin_registry() -> Vec<PluginRegistryEntry> {
    vec![
        PluginRegistryEntry {
            id: "ruflo-core".into(),
            name: "Ruflo Core".into(),
            description: "Core Ruflo agent framework — provides multi-agent orchestration, tool routing, and memory".into(),
            version: "1.2.0".into(),
            author: "Ruflo".into(),
            category: "agents".into(),
            downloads: 12400,
            rating: 4.8,
        },
        PluginRegistryEntry {
            id: "ruflo-memory".into(),
            name: "Ruflo Memory".into(),
            description: "Persistent semantic memory with vector search for Ruflo agents".into(),
            version: "0.9.3".into(),
            author: "Ruflo".into(),
            category: "memory".into(),
            downloads: 8200,
            rating: 4.6,
        },
        PluginRegistryEntry {
            id: "ruflo-tools".into(),
            name: "Ruflo Tool Pack".into(),
            description: "Extended tool collection — web search, file operations, shell commands, API calls".into(),
            version: "1.0.1".into(),
            author: "Ruflo".into(),
            category: "tools".into(),
            downloads: 9600,
            rating: 4.7,
        },
        PluginRegistryEntry {
            id: "github-integration".into(),
            name: "GitHub Integration".into(),
            description: "Git operations, PR management, issue tracking directly from the IDE".into(),
            version: "0.8.0".into(),
            author: "Nexus".into(),
            category: "integrations".into(),
            downloads: 6100,
            rating: 4.3,
        },
        PluginRegistryEntry {
            id: "docker-support".into(),
            name: "Docker Support".into(),
            description: "Container management, compose files, Dockerfile generation".into(),
            version: "0.7.2".into(),
            author: "Nexus".into(),
            category: "tools".into(),
            downloads: 4300,
            rating: 4.1,
        },
        PluginRegistryEntry {
            id: "code-review".into(),
            name: "AI Code Review".into(),
            description: "Automated code review with suggestions for improvements, bugs, and security issues".into(),
            version: "1.1.0".into(),
            author: "Nexus".into(),
            category: "ai".into(),
            downloads: 7800,
            rating: 4.5,
        },
        PluginRegistryEntry {
            id: "test-runner".into(),
            name: "Test Runner".into(),
            description: "Run and monitor tests across Jest, Vitest, pytest, cargo test, and more".into(),
            version: "0.6.0".into(),
            author: "Nexus".into(),
            category: "tools".into(),
            downloads: 5400,
            rating: 4.2,
        },
        PluginRegistryEntry {
            id: "db-explorer".into(),
            name: "Database Explorer".into(),
            description: "Browse and query SQLite, PostgreSQL, MySQL databases from the IDE".into(),
            version: "0.5.0".into(),
            author: "Nexus".into(),
            category: "tools".into(),
            downloads: 3200,
            rating: 4.0,
        },
    ]
}

#[tauri::command]
async fn plugin_registry() -> Result<Vec<PluginRegistryEntry>, String> {
    Ok(builtin_registry())
}

#[tauri::command]
async fn plugin_list() -> Result<Vec<Plugin>, String> {
    Ok(load_installed_plugins())
}

#[tauri::command]
async fn plugin_install(id: String) -> Result<Plugin, String> {
    let mut plugins = load_installed_plugins();
    if plugins.iter().any(|p| p.id == id) {
        return Err(format!("Plugin {} already installed", id));
    }
    let registry = builtin_registry();
    let entry = registry
        .iter()
        .find(|r| r.id == id)
        .ok_or_else(|| format!("Plugin {} not found in registry", id))?;
    let plugin = Plugin {
        id: entry.id.clone(),
        name: entry.name.clone(),
        description: entry.description.clone(),
        version: entry.version.clone(),
        author: entry.author.clone(),
        category: entry.category.clone(),
        enabled: true,
        installed: true,
        config: HashMap::new(),
        downloaded_at: Some(chrono_free_now()),
    };
    plugins.push(plugin.clone());
    save_installed_plugins(&plugins)?;
    Ok(plugin)
}

#[tauri::command]
async fn plugin_uninstall(id: String) -> Result<(), String> {
    let mut plugins = load_installed_plugins();
    plugins.retain(|p| p.id != id);
    save_installed_plugins(&plugins)?;
    Ok(())
}

#[tauri::command]
async fn plugin_toggle(id: String, enabled: bool) -> Result<Plugin, String> {
    let mut plugins = load_installed_plugins();
    let plugin = plugins
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Plugin {} not found", id))?;
    plugin.enabled = enabled;
    let result = plugin.clone();
    save_installed_plugins(&plugins)?;
    Ok(result)
}

#[tauri::command]
async fn plugin_update_config(id: String, config: HashMap<String, String>) -> Result<Plugin, String> {
    let mut plugins = load_installed_plugins();
    let plugin = plugins
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("Plugin {} not found", id))?;
    plugin.config = config;
    let result = plugin.clone();
    save_installed_plugins(&plugins)?;
    Ok(result)
}

// ── App Setup ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(McpManager::new())
        .manage(TermManager::new())
        .manage(AgentManager::new())
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
            chat_send,
            term_spawn,
            term_write,
            term_kill,
            agent_spawn,
            agent_kill,
            agent_list,
            agent_logs,
            memory_list,
            memory_get,
            memory_add,
            memory_update,
            memory_delete,
            memory_stats,
            plugin_registry,
            plugin_list,
            plugin_install,
            plugin_uninstall,
            plugin_toggle,
            plugin_update_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nexus");
}
