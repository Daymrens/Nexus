import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

export interface FileEntry {
  name: string;
  isDir: boolean;
  path: string;
  children?: FileEntry[];
  expanded?: boolean;
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
    lua: "lua",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    dart: "dart",
    sql: "sql",
    xml: "xml",
    svg: "xml",
    csv: "plaintext",
    txt: "plaintext",
  };
  return map[ext] || "plaintext";
}

interface EditorState {
  openFiles: OpenFile[];
  activeFile: string | null;
  fileTree: FileEntry[];
  rootPath: string;

  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  setRootPath: (path: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
  toggleDir: (path: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFile: null,
  fileTree: [],
  rootPath: "",

  openFile: async (path) => {
    const existing = get().openFiles.find((f) => f.path === path);
    if (existing) {
      set({ activeFile: path });
      return;
    }
    try {
      const content = (await invoke("read_file", { path })) as string;
      const name = path.split(/[/\\]/).pop() || path;
      set((s) => ({
        openFiles: [
          ...s.openFiles,
          {
            path,
            name,
            content,
            language: detectLanguage(name),
            modified: false,
          },
        ],
        activeFile: path,
      }));
    } catch (e) {
      console.error("Failed to open file:", e);
    }
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

  saveFile: async (path) => {
    const file = get().openFiles.find((f) => f.path === path);
    if (!file) return;
    await invoke("write_file", { path, content: file.content });
    set((s) => ({
      openFiles: s.openFiles.map((f) =>
        f.path === path ? { ...f, modified: false } : f
      ),
    }));
  },

  setRootPath: async (path) => {
    set({ rootPath: path });
    await get().refreshFileTree();
  },

  refreshFileTree: async () => {
    const root = get().rootPath;
    if (!root) return;

    async function buildTree(dirPath: string): Promise<FileEntry[]> {
      try {
        const entries = (await invoke("list_directory", {
          path: dirPath,
        })) as string[];
        const result: FileEntry[] = [];
        for (const entry of entries) {
          const isDir = entry.endsWith("/");
          const name = isDir ? entry.slice(0, -1) : entry;
          const fullPath = dirPath + (dirPath.endsWith("/") ? "" : "/") + name;
          const item: FileEntry = {
            name,
            isDir,
            path: fullPath,
          };
          if (isDir) {
            item.children = [];
            item.expanded = false;
          }
          result.push(item);
        }
        return result;
      } catch {
        return [];
      }
    }

    const tree = await buildTree(root);
    set({ fileTree: tree });
  },

  toggleDir: (path) =>
    set((s) => {
      function toggle(items: FileEntry[]): FileEntry[] {
        return items.map((item) => {
          if (item.path === path) {
            return { ...item, expanded: !item.expanded };
          }
          if (item.children) {
            return { ...item, children: toggle(item.children) };
          }
          return item;
        });
      }
      return { fileTree: toggle(s.fileTree) };
    }),
}));
