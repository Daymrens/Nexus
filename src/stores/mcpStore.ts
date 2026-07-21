import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpServer {
  id: string;
  name: string;
  command: string[];
  env: Record<string, string>;
  status: "running" | "stopped" | "error";
  tools: McpTool[];
  transport: "stdio" | "http" | "sse";
  url?: string;
  error?: string;
}

interface McpState {
  servers: McpServer[];
  addServer: (
    server: Omit<McpServer, "id" | "status" | "tools">
  ) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  startServer: (id: string) => Promise<void>;
  stopServer: (id: string) => Promise<void>;
  callTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<unknown>;
}

export const useMcpStore = create<McpState>((set) => ({
  servers: [],

  addServer: async (server) => {
    const id = `mcp-${Date.now()}`;
    set((s) => ({
      servers: [
        ...s.servers,
        { ...server, id, status: "stopped", tools: [] },
      ],
    }));
    await invoke("mcp_add_server", {
      config: {
        id,
        name: server.name,
        command: server.command,
        env: server.env,
        transport: server.transport,
        url: server.url ?? null,
      },
    });
  },

  removeServer: async (id) => {
    await invoke("mcp_remove_server", { id });
    set((s) => ({ servers: s.servers.filter((srv) => srv.id !== id) }));
  },

  startServer: async (id) => {
    set((s) => ({
      servers: s.servers.map((srv) =>
        srv.id === id ? { ...srv, status: "stopped" as const } : srv
      ),
    }));
    try {
      const tools = (await invoke("mcp_start_server", { id })) as McpTool[];
      set((s) => ({
        servers: s.servers.map((srv) =>
          srv.id === id
            ? { ...srv, status: "running" as const, tools, error: undefined }
            : srv
        ),
      }));
    } catch (e) {
      set((s) => ({
        servers: s.servers.map((srv) =>
          srv.id === id
            ? { ...srv, status: "error" as const, error: String(e) }
            : srv
        ),
      }));
    }
  },

  stopServer: async (id) => {
    await invoke("mcp_stop_server", { id });
    set((s) => ({
      servers: s.servers.map((srv) =>
        srv.id === id ? { ...srv, status: "stopped", tools: [] } : srv
      ),
    }));
  },

  callTool: async (serverId, toolName, args) => {
    return invoke("mcp_call_tool", {
      id: serverId,
      toolName,
      arguments: args,
    });
  },
}));
