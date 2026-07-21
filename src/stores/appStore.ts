import { create } from "zustand";

export type View = "chat" | "editor" | "terminal" | "mcp" | "agents" | "memory" | "plugins" | "settings";

interface AppState {
  currentView: View;
  sidebarCollapsed: boolean;
  theme: "dark" | "light";
  setView: (view: View) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "chat",
  sidebarCollapsed: false,
  theme: "dark",
  setView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
}));
