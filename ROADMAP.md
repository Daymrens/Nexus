# Nexus — Roadmap

## Phase 0: Foundation (Week 1)

**Goal:** Scaffold the project and verify toolchain works.

- [ ] Initialize Tauri 2 project with React + TypeScript template
- [ ] Configure Vite, TypeScript, Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Set up project structure (folders, barrel exports)
- [ ] Create basic layout shell (sidebar, main area, status bar)
- [ ] Verify `cargo tauri dev` runs successfully
- [ ] Set up Git repo with proper .gitignore

**Deliverable:** Empty app that opens with sidebar navigation

---

## Phase 1: Core Shell (Week 1-2)

**Goal:** Build the app's skeleton with navigation and theming.

### Layout
- [ ] AppShell component with resizable panels
- [ ] Sidebar with icons and labels
- [ ] Tab bar for switching views
- [ ] Status bar with connection indicators

### Theming
- [ ] Dark theme (default)
- [ ] Light theme
- [ ] Theme toggle in settings
- [ ] CSS variables for all colors

### Settings
- [ ] Settings view with tabs (General, Providers, Advanced)
- [ ] Persist settings to disk

**Deliverable:** App with working navigation between empty views

---

## Phase 2: MCP Server Manager (Week 2-3)

**Goal:** Connect to MCP servers and manage their lifecycle.

### Rust Backend
- [ ] MCP client using `@modelcontextprotocol/sdk` (via sidecar) or native Rust MCP
- [ ] `mcp_connect` command — spawn MCP server process
- [ ] `mcp_disconnect` command — kill server process
- [ ] `mcp_list_tools` command — get available tools
- [ ] `mcp_call_tool` command — execute a tool
- [ ] Server status tracking (running/stopped/error)
- [ ] Stdout/stderr capture for debugging

### Frontend
- [ ] ServerList component — show all configured servers
- [ ] ServerCard — status indicator, start/stop buttons
- [ ] AddServerForm — command, args, env vars
- [ ] ToolExplorer — browse tools with schemas
- [ ] ToolTester — input form, execute, show result
- [ ] Import from opencode.json

### Config
- [ ] Save MCP server configs to nexus.json
- [ ] Load on startup
- [ ] Auto-start option per server

**Deliverable:** Can add Ruflo MCP server, see its tools, test them

---

## Phase 3: Multi-Model Chat (Week 3-4)

**Goal:** Chat with AI models using MCP tools.

### Providers
- [ ] Anthropic (Claude) — streaming
- [ ] OpenAI (GPT) — streaming
- [ ] Google (Gemini) — streaming
- [ ] Ollama (local) — streaming
- [ ] OpenRouter (any model)
- [ ] Custom OpenAI-compatible

### Chat UI
- [ ] MessageList — render messages with markdown
- [ ] MessageInput — textarea with send button
- [ ] ModelSelector — pick provider and model
- [ ] StreamingDisplay — show tokens as they arrive
- [ ] ToolCallCard — show tool invocations inline

### State
- [ ] Conversation management (create, switch, delete)
- [ ] Message history with search
- [ ] Export/import conversations (JSON)
- [ ] Token usage tracking per conversation

### Integration
- [ ] Active MCP tools selection per conversation
- [ ] Tool calls during chat (model requests tool → execute → return)
- [ ] System prompt customization

**Deliverable:** Can chat with Claude and GPT, using Ruflo tools

---

## Phase 4: Code Editor (Week 4-5)

**Goal:** Edit code directly in the app.

### Monaco Integration
- [ ] Basic editor with syntax highlighting
- [ ] Multi-file tabs
- [ ] File tree sidebar
- [ ] Open file from tree
- [ ] Save file (Ctrl+S)
- [ ] Auto-save option

### Features
- [ ] Find/replace (Ctrl+F)
- [ ] Minimap
- [ ] Breadcrumb navigation
- [ ] Diff viewer
- [ ] Theme sync with app theme

### File Operations
- [ ] Read file from disk (Rust command)
- [ ] Write file to disk (Rust command)
- [ ] List directory (Rust command)
- [ ] Create file/folder
- [ ] Delete file/folder
- [ ] Rename

**Deliverable:** Can open, edit, and save files

---

## Phase 5: Terminal (Week 5-6)

**Goal:** Run commands without leaving the app.

### xterm.js Integration
- [ ] Basic terminal with shell detection
- [ ] Multiple terminal tabs
- [ ] Split panes
- [ ] Copy/paste
- [ ] Search in output

### Features
- [ ] Command history (up/down arrows)
- [ ] Environment variable display
- [ ] Working directory sync with file tree
- [ ] Kill process button

### Shell Support
- [ ] PowerShell (Windows default)
- [ ] cmd.exe (Windows fallback)
- [ ] Git Bash / WSL
- [ ] bash/zsh (macOS/Linux)

**Deliverable:** Can run git, npm, cargo commands in-app

---

## Phase 6: Agent Dashboard (Week 6-7)

**Goal:** Monitor and control AI agents (Ruflo integration).

### Rust Backend
- [ ] Ruflo CLI integration (spawn, monitor)
- [ ] Agent status tracking
- [ ] Log capture and streaming

### Frontend
- [ ] AgentList — show active agents
- [ ] AgentCard — role, task, status, progress
- [ ] AgentLogs — live log viewer
- [ ] SwarmView — visualize agent topology
- [ ] SpawnAgent form — role, task, config
- [ ] Kill agent button

### Features
- [ ] Token budget tracking per agent
- [ ] Trajectory visualization
- [ ] Agent memory namespace display

**Deliverable:** Can spawn Ruflo agents and monitor them

---

## Phase 7: Memory Viewer (Week 7-8)

**Goal:** Browse persistent agent memory.

### Features
- [ ] Semantic search bar
- [ ] Memory list with pagination
- [ ] Entry detail view (content, metadata, vectors)
- [ ] Filter by namespace, time, relevance
- [ ] Export/import memory
- [ ] Memory statistics (count, size, index health)

### Integration
- [ ] Ruflo AgentDB connection
- [ ] Direct vector search
- [ ] Memory CRUD operations

**Deliverable:** Can search and browse agent memories

---

## Phase 8: Plugin Marketplace (Week 8-9)

**Goal:** Extend Nexus with Ruflo plugins.

### Features
- [ ] Browse available plugins (from npm registry)
- [ ] Plugin cards with description, version, rating
- [ ] One-click install
- [ ] Enable/disable toggle
- [ ] Plugin configuration UI
- [ ] Update notifications
- [ ] Dependency resolution

**Deliverable:** Can install Ruflo plugins from the UI

---

## Phase 9: Polish & Ship (Week 9-10)

**Goal:** Make it production-ready for personal use.

### Polish
- [ ] Keyboard shortcuts for all major actions
- [ ] Command palette (Ctrl+Shift+P)
- [ ] Error handling and user-friendly messages
- [ ] Loading states and skeletons
- [ ] Empty states with helpful prompts

### Packaging
- [ ] Windows installer (MSI)
- [ ] macOS app bundle
- [ ] Linux packages (deb, AppImage)
- [ ] Auto-update support

### Documentation
- [ ] README with screenshots
- [ ] Configuration guide
- [ ] Troubleshooting guide

**Deliverable:** Downloadable, installable Nexus app

---

## Future Ideas (Post-v1)

- [ ] Git integration (diff, commit, push, PR)
- [ ] Debug adapter protocol (DAP) support
- [ ] Multi-window support
- [ ] Collaboration (share sessions)
- [ ] Plugin SDK for custom extensions
- [ ] Voice input
- [ ] Mobile companion app
