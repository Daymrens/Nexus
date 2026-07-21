<pre>
 ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
 ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
 ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
 ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
 ██║ ╚████║███████╗██╔╝ ╚██╗╚██████╔╝███████║
 ╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝ ╚═════╝ ╚══════╝
</pre>

# Nexus

A personal desktop IDE that unifies MCP servers, AI agents, and multi-model chat into one interface.

Built with **Tauri 2 + React 19 + Rust**.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development](#development)
- [Specification](#specification)
- [License](#license)

---

## Features

| Module | Description |
|--------|-------------|
| **Multi-Model Chat** | Stream responses from Claude, GPT, Gemini, and Ollama with conversation history, token tracking, and markdown rendering |
| **MCP Server Manager** | Add, start, stop, and monitor MCP servers. Browse tools with schemas, test them from the UI |
| **Code Editor** | Monaco-based editor with syntax highlighting for 50+ languages, file tree, multi-file tabs, Ctrl+S save |
| **Terminal** | Embedded PowerShell/bash with xterm.js, tab management, command history, auto-fit |
| **Agent Dashboard** | Spawn and kill AI agent processes, view live logs, track stdout/stderr streaming |
| **Memory Viewer** | Browse, search, create, edit, delete persistent memory entries with namespaces and tags |
| **Plugin Marketplace** | Browse 8 built-in plugins, install/uninstall, enable/disable, per-plugin configuration |
| **Settings** | Configure AI providers (API keys), appearance (theme, font), general preferences |
| **Command Palette** | Fuzzy search all commands with keyboard navigation (`Ctrl+Shift+P`) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Nexus Desktop App                         │
│                      Tauri 2 (Rust) + React 19                   │
├──────────┬───────────────────────────────────────────────────────┤
│          │                                                       │
│ Sidebar  │                   Main Content Area                   │
│          │                                                       │
│ ┌──────┐ │  ┌─────────────────────────────────────────────────┐  │
│ │ Chat │ │  │                                                 │  │
│ │ Edit │ │  │            Active View Component                │  │
│ │ Term │ │  │                                                 │  │
│ │ MCP  │ │  │  ChatView | EditorView | TerminalView | ...     │  │
│ │ Agen │ │  │                                                 │  │
│ │ Memo │ │  └─────────────────────────────────────────────────┘  │
│ │ Plug │ │                                                       │
│ │ Sett │ │                                                       │
│ └──────┘ │                                                       │
├──────────┴───────────────────────────────────────────────────────┤
│  ● MCP: 3 active  │  Agents: 2 running  │  v0.1.0  │  Ctrl+P   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        Rust Backend (lib.rs)                     │
├──────────────────────────────────────────────────────────────────┤
│  McpManager      │ JSON-RPC over stdio │ Process spawn/kill     │
│  TermManager     │ PTY emulation       │ Shell detection        │
│  AgentManager    │ Process management  │ Log streaming          │
│  AI Providers    │ Anthropic / OpenAI  │ SSE streaming          │
│  MemoryManager   │ File-based CRUD     │ Namespace filtering    │
│  PluginRegistry  │ JSON persistence    │ Install/enable/disable │
└──────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+1` | Switch to Chat |
| `Ctrl+2` | Switch to Editor |
| `Ctrl+3` | Switch to Terminal |
| `Ctrl+4` | Switch to MCP Servers |
| `Ctrl+5` | Switch to Agents |
| `Ctrl+6` | Switch to Memory |
| `Ctrl+7` | Switch to Plugins |
| `Ctrl+,` | Open Settings |
| `Escape` | Close command palette |

### Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+F` | Find/replace |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Desktop Runtime | Tauri | 2.x |
| Language (Backend) | Rust | Stable |
| Language (Frontend) | TypeScript | 5.x |
| UI Framework | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| State Management | Zustand | 5.x |
| Code Editor | Monaco Editor | Latest |
| Terminal | xterm.js | 5.x |
| HTTP Client (Rust) | Reqwest | 0.13.4 |
| Icons | Lucide React | Latest |
| Build Tool | Vite | 6.x |

---

## Project Structure

```
Nexus/
├── src/                          # React frontend
│   ├── components/
│   │   ├── agents/               # Agent dashboard
│   │   │   ├── AgentsView.tsx    # Main agent list + spawn form
│   │   │   └── SpawnAgentForm.tsx
│   │   ├── chat/                 # Multi-model chat
│   │   │   ├── ChatView.tsx      # Chat layout
│   │   │   ├── MessageList.tsx   # Message rendering
│   │   │   ├── MessageInput.tsx  # Input with send
│   │   │   └── ModelSelector.tsx # Provider/model picker
│   │   ├── editor/               # Monaco code editor
│   │   │   ├── EditorView.tsx    # Editor layout
│   │   │   ├── MonacoEditor.tsx  # Monaco wrapper
│   │   │   ├── FileTree.tsx      # Directory explorer
│   │   │   └── EditorTabs.tsx    # Open file tabs
│   │   ├── layout/               # App shell
│   │   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   │   ├── StatusBar.tsx     # Bottom status bar
│   │   │   └── CommandPalette.tsx # Ctrl+Shift+P palette
│   │   ├── memory/               # Memory viewer
│   │   │   └── MemoryView.tsx    # List, search, detail, CRUD
│   │   ├── mcp/                  # MCP server manager
│   │   │   └── McpView.tsx       # Server list, tool explorer
│   │   ├── plugins/              # Plugin marketplace
│   │   │   └── PluginsView.tsx   # Grid, categories, install
│   │   ├── settings/             # Settings UI
│   │   │   └── SettingsView.tsx  # General, providers, about
│   │   └── terminal/             # xterm.js terminal
│   │       ├── TerminalView.tsx  # Tab management
│   │       └── TerminalInstance.tsx # xterm wrapper
│   ├── stores/                   # Zustand state stores
│   │   ├── appStore.ts           # Global view navigation
│   │   ├── chatStore.ts          # Conversations + streaming
│   │   ├── editorStore.ts        # Files, tabs, open/save
│   │   ├── memoryStore.ts        # Memory CRUD + search
│   │   ├── mcpStore.ts           # MCP server state
│   │   ├── pluginStore.ts        # Plugin registry + install
│   │   ├── terminalStore.ts      # Terminal tabs
│   │   └── agentStore.ts         # Agent spawn/kill/logs
│   ├── App.tsx                   # Root layout + view router
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind + theme vars
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── ai/                   # AI provider module
│   │   │   ├── mod.rs            # Provider trait + factory
│   │   │   ├── anthropic.rs      # Anthropic Messages API
│   │   │   └── openai.rs         # OpenAI Chat Completions API
│   │   ├── lib.rs                # All Tauri commands + managers
│   │   └── main.rs               # Rust entry point
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri app config
├── ROADMAP.md                    # 10-phase development plan
├── specs.md                      # Full feature specification
└── README.md                     # This file
```

---

## Specification

### MCP Server Manager

Add, configure, start, stop, and test MCP servers from a visual interface.

- **Transport:** JSON-RPC over stdio (stdin/stdout)
- **Commands:** `mcp_add_server`, `mcp_start_server`, `mcp_stop_server`, `mcp_call_tool`, `mcp_list_tools`
- **Data:** Servers stored in memory, tools discovered via `tools/list` on connect

```typescript
interface McpServer {
  id: string;
  name: string;
  command: string[];
  args: string[];
  env: Record<string, string>;
  status: "running" | "stopped" | "error";
  tools: McpTool[];
}
```

### Multi-Model Chat

Stream responses from multiple AI providers with tool calling support.

- **Providers:** Anthropic (Claude), OpenAI (GPT), Ollama (local)
- **Streaming:** Server-Sent Events via Tauri events (`chat://token`)
- **Commands:** `chat_send` — sends messages, spawns streaming task

```typescript
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string;
  model?: string;
  timestamp: number;
}
```

### Code Editor

Monaco-based code editor with file system integration.

- **File ops:** `read_file`, `write_file`, `list_directory` (Rust commands)
- **Features:** Syntax highlighting, minimap, bracket colorization, Ctrl+S save
- **File tree:** Expandable directory browser with open-folder picker

### Terminal

Embedded terminal with xterm.js and Tauri event streaming.

- **Shell:** PowerShell (Windows) / bash (Linux/macOS)
- **Commands:** `term_spawn`, `term_write`, `term_kill`
- **Streaming:** `term://output` events for real-time output

### Agent Dashboard

Spawn, monitor, and kill AI agent processes.

- **Commands:** `agent_spawn`, `agent_kill`, `agent_list`, `agent_logs`
- **Streaming:** `agent://log` events with stdout/stderr capture
- **Buffer:** 500-line log history per agent

### Memory Viewer

File-based persistent memory with CRUD and search.

- **Storage:** `nexus_memory.json` in project root
- **Commands:** `memory_list`, `memory_get`, `memory_add`, `memory_update`, `memory_delete`, `memory_stats`
- **Features:** Namespace filtering, full-text search, tag support

### Plugin Marketplace

Registry-based plugin management.

- **Registry:** 8 built-in plugins (Ruflo Core, Memory, Tools, GitHub, Docker, Code Review, Test Runner, DB Explorer)
- **Storage:** `nexus_plugins.json` in project root
- **Commands:** `plugin_registry`, `plugin_install`, `plugin_uninstall`, `plugin_toggle`, `plugin_update_config`

### AI Provider Backend

Rust-native SSE streaming for Anthropic and OpenAI APIs.

```
src-tauri/src/ai/
├── mod.rs          # Provider trait, ChatProvider enum, streaming abstraction
├── anthropic.rs    # Anthropic Messages API (stream: true, SSE parsing)
└── openai.rs       # OpenAI Chat Completions API (stream: true, SSE parsing)
```

- **Streaming:** `reqwest` with `futures-util` for line-by-line SSE parsing
- **Events:** Tokens emitted via `app.emit("chat://token", payload)`
- **Frontend:** `listen("chat://token")` in Zustand store, appending to active message

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
git clone https://github.com/Daymrens/Nexus.git
cd Nexus
npm install
```

### Run in dev mode

```bash
npx tauri dev
```

### Build for production

```bash
npx tauri build
```

Installers output to `src-tauri/target/release/bundle/`:
- `Nexus_0.1.0_x64-setup.exe` (NSIS)
- `Nexus_0.1.0_x64_en-US.msi` (MSI)

---

## License

Personal use only — not for distribution.
