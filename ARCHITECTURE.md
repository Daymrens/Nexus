# Nexus — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nexus Desktop App                        │
│                        (Tauri 2 Shell)                          │
├────────────────────────────┬────────────────────────────────────┤
│     React Frontend         │         Rust Backend               │
│     (WebView)              │         (Tauri Core)               │
│                            │                                    │
│  ┌──────────────────┐     │  ┌──────────────────────────┐     │
│  │  UI Components   │     │  │  Tauri Commands           │     │
│  │  ─────────────── │     │  │  ─────────────────────── │     │
│  │  • Sidebar       │◄───►│  │  • spawn_process          │     │
│  │  • ChatView      │ IPC │  │  • kill_process           │     │
│  │  • CodeEditor    │     │  │  • mcp_connect            │     │
│  │  • Terminal      │     │  │  • mcp_list_tools         │     │
│  │  • AgentDash     │     │  │  • mcp_call_tool          │     │
│  │  • MemoryView    │     │  │  • load_config            │     │
│  │  • PluginMarket  │     │  │  • save_config            │     │
│  └──────────────────┘     │  │  • read_file              │     │
│                            │  │  • write_file             │     │
│  ┌──────────────────┐     │  │  • list_directory         │     │
│  │  State Stores    │     │  └──────────────────────────┘     │
│  │  ─────────────── │     │                                    │
│  │  • appStore      │     │  ┌──────────────────────────┐     │
│  │  • chatStore     │     │  │  Service Layer            │     │
│  │  • mcpStore      │     │  │  ─────────────────────── │     │
│  │  • editorStore   │     │  │  • MCP Client Manager     │     │
│  └──────────────────┘     │  │  • Process Spawner        │     │
│                            │  │  • Config Manager         │     │
│  ┌──────────────────┐     │  │  • Keychain Access        │     │
│  │  External Tools  │     │  │  • File Watcher           │     │
│  │  ─────────────── │     │  └──────────────────────────┘     │
│  │  • Monaco Editor │     │                                    │
│  │  • xterm.js      │     │  ┌──────────────────────────┐     │
│  │  • MCP SDK       │     │  │  External Processes       │     │
│  └──────────────────┘     │  │  ─────────────────────── │     │
│                            │  │  • MCP Servers (stdio)    │     │
│                            │  │  • Claude Code CLI        │     │
│                            │  │  • OpenCode CLI           │     │
│                            │  │  • Ruflo CLI              │     │
│                            │  │  • Shell (bash/zsh/ps)    │     │
│                            │  └──────────────────────────┘     │
└────────────────────────────┴────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

```
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx          # Main layout container
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── TabBar.tsx            # View tabs
│   │   └── StatusBar.tsx         # Bottom status bar
│   │
│   ├── chat/
│   │   ├── ChatView.tsx          # Main chat container
│   │   ├── MessageList.tsx       # Message display
│   │   ├── MessageInput.tsx      # User input
│   │   ├── ModelSelector.tsx     # Provider/model picker
│   │   ├── ToolPanel.tsx         # Active tools display
│   │   └── ToolCallCard.tsx      # Individual tool call
│   │
│   ├── editor/
│   │   ├── EditorView.tsx        # Editor container
│   │   ├── CodeEditor.tsx        # Monaco wrapper
│   │   ├── FileTree.tsx          # File explorer
│   │   └── TabManager.tsx        # Open file tabs
│   │
│   ├── terminal/
│   │   ├── TerminalView.tsx      # Terminal container
│   │   ├── TerminalInstance.tsx  # Single terminal
│   │   └── TerminalTabs.tsx      # Multiple terminals
│   │
│   ├── mcp/
│   │   ├── McpView.tsx           # MCP manager container
│   │   ├── ServerList.tsx        # Server list
│   │   ├── ServerCard.tsx        # Individual server
│   │   ├── ServerConfig.tsx      # Server configuration form
│   │   ├── ToolExplorer.tsx      # Browse tools
│   │   └── ToolTester.tsx        # Test tool execution
│   │
│   ├── agents/
│   │   ├── AgentView.tsx         # Agent dashboard container
│   │   ├── AgentList.tsx         # Active agents
│   │   ├── AgentCard.tsx         # Individual agent
│   │   ├── AgentLogs.tsx         # Agent log viewer
│   │   └── SwarmView.tsx         # Swarm coordination
│   │
│   ├── memory/
│   │   ├── MemoryView.tsx        # Memory viewer container
│   │   ├── MemorySearch.tsx      # Semantic search
│   │   ├── MemoryList.tsx        # Memory entries
│   │   └── MemoryEntry.tsx       # Individual entry
│   │
│   ├── plugins/
│   │   ├── PluginView.tsx        # Plugin marketplace container
│   │   ├── PluginList.tsx        # Available plugins
│   │   ├── PluginCard.tsx        # Individual plugin
│   │   └── PluginConfig.tsx      # Plugin settings
│   │
│   └── settings/
│       ├── SettingsView.tsx      # Settings container
│       ├── GeneralSettings.tsx   # Theme, fonts, etc.
│       ├── ProviderSettings.tsx  # API keys
│       └── AdvancedSettings.tsx  # Debug options
```

### State Management

```typescript
// stores/appStore.ts
interface AppState {
  currentView: View;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  setView: (view: View) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

// stores/chatStore.ts
interface ChatState {
  conversations: Conversation[];
  activeConversation: string | null;
  streaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  createConversation: (model: string) => string;
}

// stores/mcpStore.ts
interface McpState {
  servers: McpServer[];
  addServer: (server: Omit<McpServer, 'id' | 'status' | 'tools'>) => void;
  removeServer: (id: string) => void;
  startServer: (id: string) => Promise<void>;
  stopServer: (id: string) => Promise<void>;
  callTool: (serverId: string, tool: string, args: object) => Promise<any>;
}

// stores/editorStore.ts
interface EditorState {
  openFiles: File[];
  activeFile: string | null;
  modifiedFiles: Set<string>;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  saveFile: (path: string) => Promise<void>;
}
```

### Rust Backend

```
src-tauri/
├── src/
│   ├── main.rs                    # Entry point, Tauri setup
│   ├── lib.rs                     # Command registration
│   │
│   ├── commands/
│   │   ├── mod.rs                 # Command module
│   │   ├── process.rs             # Process spawn/kill
│   │   ├── mcp.rs                 # MCP operations
│   │   ├── file.rs                # File operations
│   │   ├── config.rs              # Config load/save
│   │   └── keychain.rs            # Secret storage
│   │
│   ├── mcp/
│   │   ├── mod.rs                 # MCP module
│   │   ├── client.rs              # MCP client (stdio transport)
│   │   ├── manager.rs             # Server lifecycle
│   │   ├── types.rs               # MCP types
│   │   └── transport/
│   │       ├── mod.rs
│   │       ├── stdio.rs           # Stdio transport
│   │       └── http.rs            # HTTP transport
│   │
│   ├── process/
│   │   ├── mod.rs
│   │   ├── spawner.rs             # Child process management
│   │   └── watcher.rs             # File system watcher
│   │
│   └── config/
│       ├── mod.rs
│       ├── schemas.rs             # Config types
│       └── defaults.rs            # Default values
│
├── Cargo.toml
└── tauri.conf.json
```

## Data Flow

### MCP Tool Call Flow

```
User clicks "Test Tool" in UI
        │
        ▼
React Component ──invoke("mcp_call_tool")──► Tauri Command
        │                                        │
        │                                        ▼
        │                                  MCP Client Manager
        │                                        │
        │                                        ▼
        │                                  Find server by ID
        │                                        │
        │                                        ▼
        │                                  Send JSON-RPC to server
        │                                  via stdio transport
        │                                        │
        │                                        ▼
        │                                  MCP Server processes
        │                                  (ruflo, context7, etc.)
        │                                        │
        │                                        ▼
        │                                  Return result
        │                                        │
        ◄─────────────── result ◄────────────────┘
        │
        ▼
Display result in ToolCallCard
```

### Chat Message Flow

```
User types message
        │
        ▼
MessageInput ──sendMessage()──► chatStore
        │
        ▼
Build context:
  • System prompt
  • Conversation history
  • Active MCP tool schemas
        │
        ▼
Stream to provider (Anthropic/OpenAI/etc)
        │
        ▼
Handle streaming response:
  ├─ Text chunk → Append to message
  ├─ Tool call → Invoke via MCP
  └─ Done → Save to conversation
```

## Security Model

```
┌─────────────────────────────────────────┐
│              Security Layers            │
├─────────────────────────────────────────┤
│ Layer 1: OS Keychain                    │
│   • API keys stored in system keychain  │
│   • Never written to disk as plaintext  │
├─────────────────────────────────────────┤
│ Layer 2: CSP (Content Security Policy)  │
│   • Restricts script execution          │
│   • No eval(), no inline scripts        │
├─────────────────────────────────────────┤
│ Layer 3: Capability Permissions         │
│   • Tauri v2 capability-based security  │
│   • Explicit permission per feature     │
├─────────────────────────────────────────┤
│ Layer 4: Process Isolation              │
│   • MCP servers run as child processes  │
│   • Can be killed independently         │
│   • No direct filesystem access         │
├─────────────────────────────────────────┤
│ Layer 5: User Approval                  │
│   • File writes require confirmation    │
│   • Command execution shows command     │
│   • MCP tool calls are logged           │
└─────────────────────────────────────────┘
```

## IPC Bridge

Communication between React frontend and Rust backend uses Tauri's IPC:

```typescript
// Frontend (TypeScript)
import { invoke } from '@tauri-apps/api/core';

// Call a Rust command
const tools = await invoke<McpTool[]>('mcp_list_tools', { serverId: 'ruflo' });

// Rust backend
#[tauri::command]
async fn mcp_list_tools(
    server_id: String,
    state: State<'_, AppState>
) -> Result<Vec<McpTool>, String> {
    let manager = state.mcp_manager.lock().await;
    manager.get_tools(&server_id)
        .map_err(|e| e.to_string())
}
```

## Build Pipeline

```
Development:
  npm run dev          # Vite dev server + hot reload
  cargo tauri dev      # Tauri dev mode with Rust

Production:
  npm run build        # Vite production build
  cargo tauri build    # Package for distribution

Output:
  dist/                # Vite output
  src-tauri/target/    # Rust binary
  Nexus-v0.1.0.msi     # Windows installer (~5-10MB)
  Nexus-v0.1.0.dmg     # macOS bundle
  nexus_0.1.0_amd64.deb # Linux package
```
