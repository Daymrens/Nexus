# Contributing to Nexus

Nexus is a personal project, but contributions are welcome.

## Development Setup

### Prerequisites

- Node.js 18+
- Rust (rustup)
- Git

### Setup

```bash
git clone https://github.com/youruser/nexus.git
cd nexus
npm install
```

### Run in Dev Mode

```bash
npm run dev
```

This starts the Vite dev server and Tauri simultaneously with hot reload.

## Project Structure

```
nexus/
├── src-tauri/        # Rust backend (Tauri commands, MCP client)
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   ├── mcp/
│   │   └── config/
│   └── Cargo.toml
│
├── src/              # React frontend
│   ├── components/
│   ├── stores/
│   ├── hooks/
│   └── lib/
│
├── specs.md          # Feature specification
├── ARCHITECTURE.md   # System design
└── ROADMAP.md        # Development phases
```

## Conventions

### TypeScript

- Use strict mode
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation where needed

### React

- Functional components only
- Use hooks for state and side effects
- Keep components small and focused

### Rust

- Use `thiserror` for error types
- Prefer `Result` over `panic`
- Document public functions

### Commits

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Keep commits focused and atomic

## Adding a Feature

1. Check the [ROADMAP.md](ROADMAP.md) for the current phase
2. Create a branch: `git checkout -b feat/feature-name`
3. Implement the feature
4. Test manually
5. Submit a PR with a clear description

## Adding an MCP Provider

1. Add the provider config to `nexus.json`
2. Implement the chat adapter in `src/lib/providers/`
3. Add the provider to the model selector
4. Test with a real API key

## Adding a Tauri Command

1. Define the command in `src-tauri/src/commands/`
2. Register it in `lib.rs`
3. Create a TypeScript wrapper in `src/lib/tauri.ts`
4. Use it in components via the wrapper

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include OS and app version
- Attach screenshots if UI-related

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
