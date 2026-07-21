# Nexus

**Your personal AI coding cockpit.**

Nexus is a desktop IDE that connects all your AI tools — MCP servers, Claude Code, OpenCode, Ruflo, and multiple AI models — into one unified interface.

---

## Features

- **MCP Server Manager** — Add, start, stop, and test MCP servers visually
- **Multi-Model Chat** — Chat with Claude, GPT, Gemini, Ollama, and more
- **Code Editor** — Monaco-powered editor with syntax highlighting
- **Integrated Terminal** — Run commands without leaving the app
- **Agent Dashboard** — Spawn and monitor AI agents (Ruflo)
- **Memory Viewer** — Browse persistent agent memory
- **Plugin Marketplace** — Extend with Ruflo plugins

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Editor | Monaco Editor |
| Terminal | xterm.js |
| MCP | `@modelcontextprotocol/sdk` |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/youruser/nexus.git
cd nexus

# Install dependencies
npm install

# Start development
npm run dev
```

## Prerequisites

- Node.js 18+
- Rust (via rustup)
- Windows: WebView2 (pre-installed on Windows 10/11)

## Configuration

Nexus reads its config from `nexus.json` in your project root or `~/.config/nexus/`.

```json
{
  "mcpServers": {
    "ruflo": {
      "type": "local",
      "command": ["npx", "-y", "ruflo@latest", "mcp", "start"],
      "enabled": true
    }
  }
}
```

## Project Structure

```
nexus/
├── src-tauri/        # Rust backend
├── src/              # React frontend
├── specs.md          # Full specification
├── ARCHITECTURE.md   # System design
├── ROADMAP.md        # Development phases
└── package.json
```

## Documentation

- [Specification](specs.md) — Feature requirements and data models
- [Architecture](ARCHITECTURE.md) — System design and component structure
- [Roadmap](ROADMAP.md) — Development phases and milestones

## License

MIT
