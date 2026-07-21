import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface PluginRegistryEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  downloads: number;
  rating: number;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  enabled: boolean;
  installed: boolean;
  config: Record<string, string>;
  downloaded_at: string | null;
}

interface PluginState {
  registry: PluginRegistryEntry[];
  installed: Plugin[];
  isLoading: boolean;
  categoryFilter: string | null;
  searchQuery: string;

  fetchRegistry: () => Promise<void>;
  fetchInstalled: () => Promise<void>;
  install: (id: string) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  updateConfig: (id: string, config: Record<string, string>) => Promise<void>;
  setCategoryFilter: (cat: string | null) => void;
  setSearch: (query: string) => void;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  registry: [],
  installed: [],
  isLoading: false,
  categoryFilter: null,
  searchQuery: "",

  fetchRegistry: async () => {
    set({ isLoading: true });
    const registry = (await invoke("plugin_registry")) as PluginRegistryEntry[];
    set({ registry, isLoading: false });
  },

  fetchInstalled: async () => {
    const installed = (await invoke("plugin_list")) as Plugin[];
    set({ installed });
  },

  install: async (id) => {
    await invoke("plugin_install", { id });
    await get().fetchInstalled();
  },

  uninstall: async (id) => {
    await invoke("plugin_uninstall", { id });
    set((s) => ({ installed: s.installed.filter((p) => p.id !== id) }));
  },

  toggle: async (id, enabled) => {
    await invoke("plugin_toggle", { id, enabled });
    set((s) => ({
      installed: s.installed.map((p) =>
        p.id === id ? { ...p, enabled } : p
      ),
    }));
  },

  updateConfig: async (id, config) => {
    await invoke("plugin_update_config", { id, config });
    set((s) => ({
      installed: s.installed.map((p) =>
        p.id === id ? { ...p, config } : p
      ),
    }));
  },

  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  setSearch: (query) => set({ searchQuery: query }),
}));
