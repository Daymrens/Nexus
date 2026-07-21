import { create } from "zustand";

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
}

interface McpState {
  servers: McpServer[];
  addServer: (server: Omit<McpServer, "id" | "status" | "tools">) => void;
  removeServer: (id: string) => void;
  setServerStatus: (id: string, status: McpServer["status"]) => void;
  setServerTools: (id: string, tools: McpTool[]) => void;
}

let nextId = 1;

export const useMcpStore = create<McpState>((set) => ({
  servers: [],
  addServer: (server) =>
    set((s) => ({
      servers: [
        ...s.servers,
        { ...server, id: `mcp-${nextId++}`, status: "stopped", tools: [] },
      ],
    })),
  removeServer: (id) =>
    set((s) => ({ servers: s.servers.filter((srv) => srv.id !== id) })),
  setServerStatus: (id, status) =>
    set((s) => ({
      servers: s.servers.map((srv) => (srv.id === id ? { ...srv, status } : srv)),
    })),
  setServerTools: (id, tools) =>
    set((s) => ({
      servers: s.servers.map((srv) => (srv.id === id ? { ...srv, tools } : srv)),
    })),
}));
