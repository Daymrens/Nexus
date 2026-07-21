# Nexus

A personal desktop IDE that unifies MCP servers, AI agents, and multi-model chat into one interface.

Built with **Tauri 2 + React 19 + Rust**.

## Features

- **Multi-Model Chat** — Stream responses from Claude, GPT, and Ollama with conversation history
- **MCP Server Manager** — Connect to any MCP server, browse tools, and execute them
- **Code Editor** — Monaco-based editor with syntax highlighting, file tree, and Ctrl+S save
- **Terminal** — Embedded PowerShell/bash with xterm.js, tab management
- **Agent Dashboard** — Spawn and monitor AI agent processes with live log streaming
- **Memory Viewer** — Browse, search, and manage persistent memory entries with namespaces
- **Plugin Marketplace** — Install and manage plugins with enable/disable toggles
- **Settings** — Configure providers, appearance, and general preferences

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1-7` | Switch between views |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+,` | Open settings |
| `Ctrl+S` | Save current file (in editor) |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) with `cargo-tauri`

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

The installer will be at `src-tauri/target/release/bundle/`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Editor | Monaco Editor |
| Terminal | xterm.js |
| AI | Reqwest + SSE streaming |

## Project Structure

```
Nexus/
├── src/                    # React frontend
│   ├── components/
│   │   ├── agents/         # Agent dashboard
│   │   ├── chat/           # Multi-model chat
│   │   ├── editor/         # Monaco code editor
│   │   ├── layout/         # Sidebar, status bar, command palette
│   │   ├── memory/         # Memory viewer
│   │   ├── mcp/            # MCP server manager
│   │   ├── plugins/        # Plugin marketplace
│   │   ├── settings/       # Settings UI
│   │   └── terminal/       # xterm.js terminal
│   └── stores/             # Zustand state stores
├── src-tauri/              # Rust backend
│   └── src/
│       ├── ai/             # AI provider implementations
│       └── lib.rs          # Tauri commands and managers
├── ROADMAP.md              # Development roadmap
└── specs.md                # Feature specification
```

## License

Personal use only — not for distribution.
