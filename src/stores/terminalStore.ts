import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface TerminalTab {
  id: string;
  title: string;
}

interface TerminalState {
  tabs: TerminalTab[];
  activeTab: string | null;
  isRunning: Record<string, boolean>;

  createTab: (cwd?: string) => Promise<string>;
  closeTab: (id: string) => Promise<void>;
  setActiveTab: (id: string) => void;
  writeToTab: (id: string, data: string) => Promise<void>;
}

let unlistenOutput: UnlistenFn | null = null;

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTab: null,
  isRunning: {},

  createTab: async (cwd?: string) => {
    const id = `term-${Date.now()}`;
    const tabCount = get().tabs.length + 1;

    set((s) => ({
      tabs: [...s.tabs, { id, title: `Terminal ${tabCount}` }],
      activeTab: id,
      isRunning: { ...s.isRunning, [id]: true },
    }));

    // Set up output listener if not already listening
    if (!unlistenOutput) {
      unlistenOutput = await listen<{ id: string; data: number[] }>(
        "term://output",
        (event) => {
          const { id, data } = event.payload;
          const termEl = document.getElementById(`xterm-${id}`);
          if (termEl) {
            const text = new TextDecoder().decode(new Uint8Array(data));
            const ref = (termEl as unknown as { __xterm__?: { write: (d: string) => void } }).__xterm__;
            ref?.write(text);
          }
        }
      );
    }

    await invoke("term_spawn", {
      id,
      cwd: cwd || null,
    });

    return id;
  },

  closeTab: async (id) => {
    await invoke("term_kill", { id });
    set((s) => {
      const remaining = s.tabs.filter((t) => t.id !== id);
      const newRunning = { ...s.isRunning };
      delete newRunning[id];
      return {
        tabs: remaining,
        activeTab:
          s.activeTab === id ? remaining[0]?.id ?? null : s.activeTab,
        isRunning: newRunning,
      };
    });

    // Clean up listener if no tabs left
    if (get().tabs.length === 0 && unlistenOutput) {
      unlistenOutput();
      unlistenOutput = null;
    }
  },

  setActiveTab: (id) => set({ activeTab: id }),

  writeToTab: async (id, data) => {
    await invoke("term_write", { id, data });
  },
}));
