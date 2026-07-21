import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface MemoryEntry {
  id: string;
  namespace: string;
  content: string;
  tags: string[];
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface MemoryStats {
  total_entries: number;
  namespaces: string[];
  total_size_bytes: number;
}

interface MemoryState {
  entries: MemoryEntry[];
  stats: MemoryStats | null;
  selectedId: string | null;
  searchQuery: string;
  namespaceFilter: string | null;
  isLoading: boolean;

  fetchEntries: () => Promise<void>;
  fetchStats: () => Promise<void>;
  addEntry: (
    namespace: string,
    content: string,
    tags: string[],
    metadata?: Record<string, string>
  ) => Promise<void>;
  updateEntry: (
    id: string,
    content?: string,
    tags?: string[],
    metadata?: Record<string, string>
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  selectEntry: (id: string | null) => void;
  setSearch: (query: string) => void;
  setNamespaceFilter: (ns: string | null) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  entries: [],
  stats: null,
  selectedId: null,
  searchQuery: "",
  namespaceFilter: null,
  isLoading: false,

  fetchEntries: async () => {
    set({ isLoading: true });
    const entries = (await invoke("memory_list", {
      namespace: get().namespaceFilter || null,
      search: get().searchQuery || null,
      limit: 200,
      offset: 0,
    })) as MemoryEntry[];
    set({ entries, isLoading: false });
  },

  fetchStats: async () => {
    const stats = (await invoke("memory_stats")) as MemoryStats;
    set({ stats });
  },

  addEntry: async (namespace, content, tags, metadata = {}) => {
    await invoke("memory_add", {
      namespace,
      content,
      tags,
      metadata,
    });
    await get().fetchEntries();
    await get().fetchStats();
  },

  updateEntry: async (id, content, tags, metadata) => {
    await invoke("memory_update", {
      id,
      content: content || null,
      tags: tags || null,
      metadata: metadata || null,
    });
    await get().fetchEntries();
  },

  deleteEntry: async (id) => {
    await invoke("memory_delete", { id });
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    await get().fetchStats();
  },

  selectEntry: (id) => set({ selectedId: id }),

  setSearch: (query) => {
    set({ searchQuery: query });
    get().fetchEntries();
  },

  setNamespaceFilter: (ns) => {
    set({ namespaceFilter: ns });
    get().fetchEntries();
  },
}));
