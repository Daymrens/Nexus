import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  task: string;
  status: "running" | "stopped" | "error";
  logs: string[];
  pid: number | null;
}

interface AgentState {
  agents: AgentInfo[];
  selectedAgentId: string | null;
  showSpawnForm: boolean;

  refreshAgents: () => Promise<void>;
  spawnAgent: (config: {
    name: string;
    role: string;
    task: string;
    command: string[];
    env?: Record<string, string>;
  }) => Promise<void>;
  killAgent: (id: string) => Promise<void>;
  selectAgent: (id: string | null) => void;
  setShowSpawnForm: (show: boolean) => void;
}

let unlistenLog: UnlistenFn | null = null;
let unlistenStatus: UnlistenFn | null = null;

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  selectedAgentId: null,
  showSpawnForm: false,

  refreshAgents: async () => {
    const agents = (await invoke("agent_list")) as AgentInfo[];
    set({ agents });
  },

  spawnAgent: async (config) => {
    const id = `agent-${Date.now()}`;
    await invoke("agent_spawn", {
      config: {
        id,
        name: config.name,
        role: config.role,
        task: config.task,
        command: config.command,
        env: config.env || {},
      },
    });

    // Set up event listeners if not already listening
    if (!unlistenLog) {
      unlistenLog = await listen<{ id: string; line: string }>(
        "agent://log",
        (event) => {
          const { id, line } = event.payload;
          set((s) => ({
            agents: s.agents.map((a) =>
              a.id === id
                ? { ...a, logs: [...a.logs.slice(-499), line] }
                : a
            ),
          }));
        }
      );
    }

    if (!unlistenStatus) {
      unlistenStatus = await listen<{ id: string; status: string }>(
        "agent://status",
        (event) => {
          const { id, status } = event.payload;
          set((s) => ({
            agents: s.agents.map((a) =>
              a.id === id
                ? { ...a, status: status as AgentInfo["status"] }
                : a
            ),
          }));
        }
      );
    }

    // Add agent to local state immediately
    set((s) => ({
      agents: [
        ...s.agents,
        {
          id,
          name: config.name,
          role: config.role,
          task: config.task,
          status: "running",
          logs: [],
          pid: null,
        },
      ],
      showSpawnForm: false,
    }));
  },

  killAgent: async (id) => {
    await invoke("agent_kill", { id });
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
      selectedAgentId:
        s.selectedAgentId === id ? null : s.selectedAgentId,
    }));
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setShowSpawnForm: (show) => set({ showSpawnForm: show }),
}));
