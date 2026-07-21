# Nexus — Roadmap

## Phase 0: Foundation ✅

**Goal:** Scaffold the project and verify toolchain works.

- [x] Initialize Tauri 2 project with React + TypeScript template
- [x] Configure Vite, TypeScript, Tailwind CSS
- [ ] Install and configure shadcn/ui
- [x] Set up project structure (folders, barrel exports)
- [x] Create basic layout shell (sidebar, main area, status bar)
- [x] Verify `cargo tauri dev` runs successfully
- [x] Set up Git repo with proper .gitignore

---

## Phase 1: Core Shell ✅

**Goal:** Build the app's skeleton with navigation and theming.

### Layout
- [x] AppShell component with resizable panels
- [x] Sidebar with icons and labels
- [x] Tab bar for switching views
- [x] Status bar with connection indicators

### Theming
- [x] Dark theme (default)
- [ ] Light theme
- [ ] Theme toggle in settings
- [x] CSS variables for all colors

### Settings
- [x] Settings view with tabs (General, Providers, Advanced)
- [ ] Persist settings to disk

---

## Phase 2: MCP Server Manager ✅

**Goal:** Connect to MCP servers and manage their lifecycle.

### Rust Backend
- [x] MCP client using native Rust MCP (JSON-RPC over stdio)
- [x] `mcp_add_server` command — register server config
- [x] `mcp_remove_server` command — delete server config
- [x] `mcp_start_server` command — spawn MCP server process
- [x] `mcp_stop_server` command — kill server process
- [x] `mcp_list_tools` command — get available tools
- [x] `mcp_call_tool` command — execute a tool
- [x] Server status tracking (running/stopped/error)
- [ ] Stdout/stderr capture for debugging

### Frontend
- [x] McpView — show all configured servers
- [x] ServerCard — status indicator, start/stop buttons
- [x] AddServerForm — command, args, env vars
- [x] ToolExplorer — browse tools with schemas
- [x] ToolTester — input form, execute, show result
- [ ] Import from opencode.json

### Config
- [ ] Save MCP server configs to nexus.json (currently in-memory)
- [ ] Load on startup
- [ ] Auto-start option per server

---

## Phase 3: Multi-Model Chat ✅

**Goal:** Chat with AI models using MCP tools.

### Providers
- [x] Anthropic (Claude) — streaming
- [x] OpenAI (GPT) — streaming
- [x] Ollama (local) — streaming
- [ ] Google (Gemini) — streaming
- [ ] OpenRouter (any model)
- [ ] Custom OpenAI-compatible

### Chat UI
- [x] MessageList — render messages with markdown
- [x] MessageInput — textarea with send button
- [x] ModelSelector — pick provider and model
- [x] StreamingDisplay — show tokens as they arrive
- [ ] ToolCallCard — show tool invocations inline

### State
- [x] Conversation management (create, switch, delete)
- [ ] Message history with search
- [ ] Export/import conversations (JSON)
- [ ] Token usage tracking per conversation

### Integration
- [ ] Active MCP tools selection per conversation
- [ ] Tool calls during chat (model requests tool → execute → return)
- [ ] System prompt customization

---

## Phase 4: Code Editor ✅

**Goal:** Edit code directly in the app.

### Monaco Integration
- [x] Basic editor with syntax highlighting
- [x] Multi-file tabs
- [x] File tree sidebar
- [x] Open file from tree
- [x] Save file (Ctrl+S)
- [ ] Auto-save option

### Features
- [x] Find/replace (Ctrl+F)
- [x] Minimap
- [ ] Breadcrumb navigation
- [ ] Diff viewer
- [ ] Theme sync with app theme

### File Operations
- [x] Read file from disk (Rust command)
- [x] Write file to disk (Rust command)
- [x] List directory (Rust command)
- [ ] Create file/folder
- [ ] Delete file/folder
- [ ] Rename

---

## Phase 5: Terminal ✅

**Goal:** Run commands without leaving the app.

### xterm.js Integration
- [x] Basic terminal with shell detection
- [x] Multiple terminal tabs
- [ ] Split panes
- [x] Copy/paste
- [ ] Search in output

### Features
- [x] Command history (up/down arrows)
- [ ] Environment variable display
- [ ] Working directory sync with file tree
- [x] Kill process button

### Shell Support
- [x] PowerShell (Windows default)
- [ ] cmd.exe (Windows fallback)
- [ ] Git Bash / WSL
- [ ] bash/zsh (macOS/Linux)

---

## Phase 6: Agent Dashboard ✅

**Goal:** Monitor and control AI agents.

### Rust Backend
- [x] Agent status tracking
- [x] Log capture and streaming
- [ ] Ruflo CLI integration (spawn, monitor)

### Frontend
- [x] AgentsView — show active agents
- [x] AgentCard — role, task, status
- [x] SpawnAgent form — role, task, config
- [x] Kill agent button
- [ ] SwarmView — visualize agent topology

### Features
- [ ] Token budget tracking per agent
- [ ] Trajectory visualization
- [ ] Agent memory namespace display

---

## Phase 7: Memory Viewer ✅

**Goal:** Browse persistent agent memory.

### Features
- [ ] Semantic search bar
- [x] Memory list with pagination
- [x] Entry detail view (content, metadata)
- [x] Filter by namespace
- [ ] Export/import memory
- [x] Memory statistics (count, size)

### Integration
- [ ] Ruflo AgentDB connection
- [ ] Direct vector search
- [x] Memory CRUD operations

---

## Phase 8: Plugin Marketplace ✅

**Goal:** Extend Nexus with plugins.

### Features
- [x] Browse available plugins (built-in registry)
- [x] Plugin cards with description, version, rating
- [x] One-click install
- [x] Enable/disable toggle
- [x] Plugin configuration UI
- [ ] Update notifications
- [ ] Dependency resolution

---

## Phase 9: Polish & Ship ✅

**Goal:** Make it production-ready for personal use.

### Polish
- [x] Keyboard shortcuts for all major actions
- [x] Command palette (Ctrl+Shift+P)
- [ ] Error handling and user-friendly messages
- [ ] Loading states and skeletons
- [ ] Empty states with helpful prompts

### Packaging
- [x] Windows installer (MSI)
- [ ] macOS app bundle
- [ ] Linux packages (deb, AppImage)
- [ ] Auto-update support

### Documentation
- [x] README with full spec
- [ ] Configuration guide
- [ ] Troubleshooting guide

---

## Phase 10: Hardening (in progress)

**Goal:** Fix known gaps from initial build.

- [ ] Real PTY terminal (portable-pty instead of piped Command)
- [ ] Persistence for MCP servers, chat conversations, agent configs
- [ ] API key storage via keyring crate
- [ ] Wire Settings → Providers tab to actual state
- [ ] Persist settings to disk

---

## Future Ideas (Post-v1)

- [ ] Git integration (diff, commit, push, PR)
- [ ] Debug adapter protocol (DAP) support
- [ ] Multi-window support
- [ ] Collaboration (share sessions)
- [ ] Plugin SDK for custom extensions
- [ ] Voice input
- [ ] Mobile companion app
