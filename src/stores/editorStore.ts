import { create } from "zustand";

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

interface EditorState {
  openFiles: OpenFile[];
  activeFile: string | null;
  openFile: (path: string, name: string, content: string, language: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
}

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    py: "python",
    rs: "rust",
    go: "go",
    toml: "toml",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
    ps1: "powershell",
  };
  return map[ext] || "plaintext";
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFile: null,

  openFile: (path, name, content, language) => {
    const existing = get().openFiles.find((f) => f.path === path);
    if (existing) {
      set({ activeFile: path });
      return;
    }
    set((s) => ({
      openFiles: [
        ...s.openFiles,
        { path, name, content, language: language || detectLanguage(name), modified: false },
      ],
      activeFile: path,
    }));
  },

  closeFile: (path) =>
    set((s) => {
      const files = s.openFiles.filter((f) => f.path !== path);
      const activeFile =
        s.activeFile === path
          ? files.length > 0
            ? files[files.length - 1].path
            : null
          : s.activeFile;
      return { openFiles: files, activeFile };
    }),

  setActiveFile: (path) => set({ activeFile: path }),

  updateContent: (path, content) =>
    set((s) => ({
      openFiles: s.openFiles.map((f) =>
        f.path === path ? { ...f, content, modified: true } : f
      ),
    })),

  saveFile: async (_path) => {
    // TODO: Implement via Tauri invoke
    set((s) => ({
      openFiles: s.openFiles.map((f) =>
        f.path === _path ? { ...f, modified: false } : f
      ),
    }));
  },
}));
