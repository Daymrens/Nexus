import { useMcpStore } from "../../stores/mcpStore";
import { useChatStore } from "../../stores/chatStore";

export function StatusBar() {
  const servers = useMcpStore((s) => s.servers);
  const conversations = useChatStore((s) => s.conversations);

  const runningServers = servers.filter((s) => s.status === "running").length;
  const totalTools = servers.reduce((acc, s) => acc + s.tools.length, 0);

  return (
    <footer className="flex items-center justify-between px-4 py-1.5 bg-nexus-surface border-t border-nexus-border text-xs text-nexus-text-muted">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              runningServers > 0 ? "bg-green-500" : "bg-nexus-text-muted"
            }`}
          />
          MCP: {runningServers} active · {totalTools} tools
        </span>
        <span>Conversations: {conversations.length}</span>
      </div>
      <div className="flex items-center gap-4">
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-bg border border-nexus-border">
          Ctrl+Shift+P
        </kbd>
        <span>Nexus v0.1.0</span>
      </div>
    </footer>
  );
}
