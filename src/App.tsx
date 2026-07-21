import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { ChatView } from "./components/chat/ChatView";
import { McpView } from "./components/mcp/McpView";
import { EditorView } from "./components/editor/EditorView";
import { TerminalView } from "./components/terminal/TerminalView";
import { AgentsView } from "./components/agents/AgentsView";
import { MemoryView } from "./components/memory/MemoryView";
import { PluginsView } from "./components/plugins/PluginsView";
import { useAppStore } from "./stores/appStore";

const views: Record<string, React.FC> = {
  chat: ChatView,
  editor: EditorView,
  terminal: TerminalView,
  mcp: McpView,
  agents: AgentsView,
  memory: MemoryView,
  plugins: PluginsView,
  settings: () => <div className="p-4 text-nexus-text-muted">Settings — coming soon</div>,
};

export default function App() {
  const currentView = useAppStore((s) => s.currentView);
  const View = views[currentView] || views.chat;

  return (
    <div className="flex h-screen bg-nexus-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          <View />
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
