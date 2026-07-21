import {
  MessageSquare,
  Code2,
  Terminal,
  Plug,
  Bot,
  Brain,
  Puzzle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppStore, type View } from "../../stores/appStore";

const navItems: { id: View; icon: React.FC<{ size?: number }>; label: string }[] = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "editor", icon: Code2, label: "Editor" },
  { id: "terminal", icon: Terminal, label: "Terminal" },
  { id: "mcp", icon: Plug, label: "MCP" },
  { id: "agents", icon: Bot, label: "Agents" },
  { id: "memory", icon: Brain, label: "Memory" },
  { id: "plugins", icon: Puzzle, label: "Plugins" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { currentView, setView, sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={`flex flex-col bg-nexus-surface border-r border-nexus-border transition-all duration-200 ${
        sidebarCollapsed ? "w-14" : "w-48"
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-nexus-border">
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold text-nexus-accent tracking-wide">
            NEXUS
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-nexus-bg text-nexus-text-muted"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`sidebar-item w-full ${currentView === id ? "active" : ""}`}
          >
            <Icon size={18} />
            {!sidebarCollapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-nexus-border">
        <div className={`text-xs text-nexus-text-muted ${sidebarCollapsed ? "text-center" : ""}`}>
          {sidebarCollapsed ? "0.1" : "v0.1.0"}
        </div>
      </div>
    </aside>
  );
}
