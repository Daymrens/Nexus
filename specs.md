# Nexus — Project Specification

**Version:** 0.1.0
**Date:** July 21, 2026
**Status:** Draft

---

## Overview

Nexus is a personal desktop IDE that unifies AI coding tools — MCP servers, Claude Code, OpenCode, Ruflo, and multi-model chat — into a single, cohesive interface. Built with Tauri 2 (Rust) and React, it provides a lightweight (~5MB), high-performance hub for AI-assisted development.

## Goals

1. **Unify** — One place to manage all AI coding tools instead of juggling multiple terminals and configs
2. **Connect** — MCP server management with visual tool exploration and testing
3. **Chat** — Multi-model conversations with tool calling (Claude, GPT, Gemini, local models)
4. **Code** — Built-in code editor with syntax highlighting and terminal
5. **Coordinate** — Agent dashboard for spawning, monitoring, and coordinating AI agents
6. **Remember** — Persistent memory across sessions via vector database integration

## Non-Goals

- Not a replacement for Claude Code, OpenCode, or any individual tool
- Not a multi-user/enterprise product — personal use only
- Not a full VS Code replacement — focused on AI-assisted workflows

---

## Core Features

### 1. MCP Server Manager

**Description:** Visual interface to add, configure, start, stop, and monitor MCP servers.

**Requirements:**
- Add MCP servers via UI (command, args, env vars)
- Start/stop individual servers
- View available tools per server with schemas
- Test tools directly from the UI with custom arguments
- Import configurations from `opencode.json`, Claude config, or `claude_desktop_config.json`
- Auto-discover installed MCP servers
- Server status indicators (running, stopped, error)

**Data Model:**
```typescript
interface McpServer {
  id: string;
  name: string;
  command: string[];
  args: string[];
  env: Record<string, string>;
  status: 'running' | 'stopped' | 'error';
  tools: McpTool[];
  transport: 'stdio' | 'http' | 'sse';
  url?: string; // for HTTP/SSE transports
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
}
```

### 2. Multi-Model Chat

**Description:** Chat interface supporting multiple AI providers with MCP tool integration.

**Requirements:**
- Connect to Claude, GPT, Gemini, Cohere, Ollama (local)
- Streaming responses
- Select which MCP tools are active per conversation
- Tool call visualization (show when tools are invoked, results)
- Conversation history with search
- Export/import conversations (JSON)
- System prompt customization
- Token usage tracking

**Supported Providers:**
| Provider | Models | Auth |
|----------|--------|------|
| Anthropic | Claude 4, Sonnet 4 | API Key |
| OpenAI | GPT-4o, GPT-4.1 | API Key |
| Google | Gemini 2.5 Pro/Flash | API Key |
| Ollama | Local models | None |
| OpenRouter | Any model | API Key |
| Custom | OpenAI-compatible | API Key |

### 3. Code Editor

**Description:** Built-in code editor powered by Monaco (same as VS Code).

**Requirements:**
- Syntax highlighting for 50+ languages
- Multi-file tabs
- File tree sidebar
- Find/replace
- Minimap
- Auto-save
- Theme support (dark/light/custom)
- Diff viewer
- Breadcrumb navigation

### 4. Integrated Terminal

**Description:** Terminal emulator for running commands directly in the IDE.

**Requirements:**
- Multiple terminal tabs
- Split panes
- Copy/paste
- Search in output
- Auto-detect shell (bash, zsh, PowerShell, cmd)
- Command history
- Environment variable display

### 5. Agent Dashboard

**Description:** Visual dashboard for spawning, monitoring, and coordinating AI agents (Ruflo integration).

**Requirements:**
- Spawn agents with role, task, and configuration
- View active agents with status, logs, and progress
- Kill runaway agents
- Swarm coordination view (hierarchy, mesh, adaptive)
- Agent memory namespace per agent
- Token budget tracking
- Trajectory visualization

### 6. Memory Viewer

**Description:** Browse and search persistent agent memory (Ruflo AgentDB).

**Requirements:**
- Search memory entries by semantic similarity
- View memory entries with metadata
- Filter by namespace, timestamp, relevance
- Export/import memory
- Memory statistics (entry count, index size, etc.)

### 7. Plugin Marketplace

**Description:** Browse, install, and manage Ruflo plugins.

**Requirements:**
- Browse available plugins with descriptions
- One-click install via npm
- Enable/disable plugins
- Plugin configuration UI
- Plugin dependency resolution
- Update notifications

---

## UI Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Nexus]  [File] [Edit] [View] [Tools]           [_][□][×]  │
├─────┬───────────────────────────────────────────────────────┤
│     │  [Chat] [Editor] [Terminal] [MCP] [Agents] [Memory]  │
│  S  ├───────────────────────────────────────────────────────┤
│  I  │                                                       │
│  D  │                    Main Content                       │
│  E  │                    Area                               │
│  B  │                                                       │
│  A  │                                                       │
│  R  │                                                       │
│     │                                                       │
├─────┴───────────────────────────────────────────────────────┤
│ ● MCP: 3 active │ 🤖 Agents: 2 running │ 💾 Memory: 1.2k  │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation

| Icon | View | Description |
|------|------|-------------|
| 💬 | Chat | Multi-model conversations |
| 📝 | Editor | Code editing with Monaco |
| >_ | Terminal | Integrated terminal |
| 🔌 | MCP | Server management |
| 🤖 | Agents | Agent dashboard |
| 🧠 | Memory | Memory viewer |
| 🧩 | Plugins | Plugin marketplace |
| ⚙️ | Settings | Configuration |

### Color Palette

```css
:root {
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #252525;
  --accent: #6366f1;      /* Indigo */
  --accent-hover: #818cf8;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --border: #27272a;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
}
```

---

## Technical Requirements

### Performance

- Cold start: < 2 seconds
- MCP tool call latency: < 100ms overhead
- Editor load: < 500ms for files up to 1MB
- Memory usage: < 200MB baseline

### Compatibility

- Windows 10/11 (primary)
- macOS (secondary)
- Linux (tertiary)

### Security

- API keys stored in OS keychain (via Tauri plugin)
- No code execution without user approval
- MCP server processes sandboxed
- Content Security Policy (CSP) enabled
- No telemetry by default

### Storage

- Config: `~/.config/nexus/` (XDG compliant on Linux/macOS)
- Config: `%APPDATA%/nexus/` on Windows
- Memory DB: `<project>/.nexus/memory/`
- Sessions: `<project>/.nexus/sessions/`

---

## Configuration

### App Config (`nexus.json`)

```json
{
  "$schema": "https://nexus.dev/config.json",
  "theme": "dark",
  "mcpServers": {
    "ruflo": {
      "type": "local",
      "command": ["npx", "-y", "ruflo@latest", "mcp", "start"],
      "enabled": true
    }
  },
  "providers": {
    "anthropic": {
      "apiKey": "{env:ANTHROPIC_API_KEY}"
    },
    "openai": {
      "apiKey": "{env:OPENAI_API_KEY}"
    }
  },
  "editor": {
    "fontSize": 14,
    "fontFamily": "JetBrains Mono",
    "tabSize": 2
  },
  "terminal": {
    "shell": "auto",
    "fontSize": 13
  }
}
```

---

## Dependencies

### Frontend

| Package | Purpose |
|---------|---------|
| `@monaco-editor/react` | Code editor |
| `@xterm/xterm` | Terminal emulator |
| `@xterm/addon-fit` | Terminal auto-fit |
| `zustand` | State management |
| `tailwindcss` | Styling |
| `@shadcn/ui` | UI components |
| `lucide-react` | Icons |
| `@modelcontextprotocol/sdk` | MCP client |
| `marked` | Markdown rendering |
| `highlight.js` | Code syntax highlighting in chat |

### Backend (Rust)

| Crate | Purpose |
|-------|---------|
| `tauri` | Desktop framework |
| `serde` / `serde_json` | Serialization |
| `tokio` | Async runtime |
| `reqwest` | HTTP client |
| `keyring` | OS keychain integration |
| `notify` | File watching |
| `portable-pty` | Terminal emulation |

---

## Success Metrics

- [ ] Can add and manage MCP servers from the UI
- [ ] Can chat with multiple AI models in one interface
- [ ] Can edit code with syntax highlighting
- [ ] Can run terminal commands
- [ ] Can spawn and monitor AI agents
- [ ] Cold start under 2 seconds
- [ ] Memory usage under 200MB
- [ ] Works on Windows 10/11
