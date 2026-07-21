import { useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { CommandPalette } from "./components/layout/CommandPalette";
import { ChatView } from "./components/chat/ChatView";
import { McpView } from "./components/mcp/McpView";
import { EditorView } from "./components/editor/EditorView";
import { TerminalView } from "./components/terminal/TerminalView";
import { AgentsView } from "./components/agents/AgentsView";
import { MemoryView } from "./components/memory/MemoryView";
import { PluginsView } from "./components/plugins/PluginsView";
import { SettingsView } from "./components/settings/SettingsView";
import { useAppStore, type View } from "./stores/appStore";
import { useChatStore } from "./stores/chatStore";
import { useMcpStore } from "./stores/mcpStore";
import { useAgentStore } from "./stores/agentStore";

const views: Record<string, React.FC> = {
  chat: ChatView,
  editor: EditorView,
  terminal: TerminalView,
  mcp: McpView,
  agents: AgentsView,
  memory: MemoryView,
  plugins: PluginsView,
  settings: SettingsView,
};

const VIEW_SHORTCUTS: Record<string, View> = {
  "1": "chat",
  "2": "editor",
  "3": "terminal",
  "4": "mcp",
  "5": "agents",
  "6": "memory",
  "7": "plugins",
};

export default function App() {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);
  const View = views[currentView] || views.chat;

  // Load persisted data on startup
  useEffect(() => {
    useChatStore.getState().loadConversations();
    useMcpStore.getState().loadServers();
    useAgentStore.getState().loadConfigs();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        const view = VIEW_SHORTCUTS[e.key];
        if (view) {
          e.preventDefault();
          setView(view);
        }
        if (e.key === ",") {
          e.preventDefault();
          setView("settings");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setView]);

  return (
    <div className="flex h-screen bg-nexus-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          <View />
        </main>
        <StatusBar />
      </div>
      <CommandPalette />
    </div>
  );
}
