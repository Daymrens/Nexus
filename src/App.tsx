import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { ChatView } from "./components/chat/ChatView";
import { McpView } from "./components/mcp/McpView";
import { EditorView } from "./components/editor/EditorView";
import { TerminalView } from "./components/terminal/TerminalView";
import { useAppStore } from "./stores/appStore";

const views: Record<string, React.FC> = {
  chat: ChatView,
  editor: EditorView,
  terminal: TerminalView,
  mcp: McpView,
  agents: () => <div className="p-4 text-nexus-text-muted">Agent Dashboard — coming soon</div>,
  memory: () => <div className="p-4 text-nexus-text-muted">Memory Viewer — coming soon</div>,
  plugins: () => <div className="p-4 text-nexus-text-muted">Plugin Marketplace — coming soon</div>,
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
