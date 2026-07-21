import { useEffect, useState, useRef, useMemo } from "react";
import {
  MessageSquare,
  Code2,
  Terminal,
  Server,
  Bot,
  Database,
  Puzzle,
  Settings,
  Search,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";

interface Command {
  id: string;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const setView = useAppStore((s) => s.setView);

  const commands: Command[] = useMemo(
    () => [
      {
        id: "view-chat",
        label: "Go to Chat",
        shortcut: "Ctrl+1",
        icon: <MessageSquare size={14} />,
        action: () => setView("chat"),
      },
      {
        id: "view-editor",
        label: "Go to Editor",
        shortcut: "Ctrl+2",
        icon: <Code2 size={14} />,
        action: () => setView("editor"),
      },
      {
        id: "view-terminal",
        label: "Go to Terminal",
        shortcut: "Ctrl+3",
        icon: <Terminal size={14} />,
        action: () => setView("terminal"),
      },
      {
        id: "view-mcp",
        label: "Go to MCP Servers",
        shortcut: "Ctrl+4",
        icon: <Server size={14} />,
        action: () => setView("mcp"),
      },
      {
        id: "view-agents",
        label: "Go to Agents",
        shortcut: "Ctrl+5",
        icon: <Bot size={14} />,
        action: () => setView("agents"),
      },
      {
        id: "view-memory",
        label: "Go to Memory",
        shortcut: "Ctrl+6",
        icon: <Database size={14} />,
        action: () => setView("memory"),
      },
      {
        id: "view-plugins",
        label: "Go to Plugins",
        shortcut: "Ctrl+7",
        icon: <Puzzle size={14} />,
        action: () => setView("plugins"),
      },
      {
        id: "view-settings",
        label: "Go to Settings",
        shortcut: "Ctrl+,",
        icon: <Settings size={14} />,
        action: () => setView("settings"),
      },
    ],
    [setView]
  );

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        return;
      }

      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[selectedIndex]?.action();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, filtered, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative bg-nexus-surface border border-nexus-border rounded-xl shadow-2xl w-[480px] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-nexus-border">
          <Search size={16} className="text-nexus-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-nexus-text outline-none placeholder:text-nexus-text-muted"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-bg text-nexus-text-muted border border-nexus-border">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[300px] overflow-auto py-1">
          {filtered.length === 0 && (
            <p className="text-xs text-nexus-text-muted text-center py-4">
              No commands found
            </p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                setIsOpen(false);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                i === selectedIndex
                  ? "bg-nexus-accent/10 text-nexus-accent"
                  : "text-nexus-text hover:bg-nexus-bg"
              }`}
            >
              <span className="shrink-0">{cmd.icon}</span>
              <span className="flex-1 text-left">{cmd.label}</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-bg text-nexus-text-muted border border-nexus-border">
                {cmd.shortcut}
              </kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
