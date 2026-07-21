import { useState } from "react";
import { Plus, Play, Square, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useMcpStore, type McpServer } from "../../stores/mcpStore";

export function McpView() {
  const { servers, addServer, removeServer, setServerStatus } = useMcpStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [newServer, setNewServer] = useState({
    name: "",
    command: "",
    transport: "stdio" as "stdio" | "http" | "sse",
    url: "",
  });

  const handleAdd = () => {
    if (!newServer.name) return;
    const cmd = newServer.command.split(" ").filter(Boolean);
    addServer({
      name: newServer.name,
      command: cmd,
      env: {},
      transport: newServer.transport,
      url: newServer.url || undefined,
    });
    setNewServer({ name: "", command: "", transport: "stdio", url: "" });
    setShowAddForm(false);
  };

  const toggleServer = (server: McpServer) => {
    if (server.status === "running") {
      setServerStatus(server.id, "stopped");
    } else {
      setServerStatus(server.id, "running");
    }
  };

  return (
    <div className="flex h-full">
      {/* Server list */}
      <div className="w-72 border-r border-nexus-border bg-nexus-surface flex flex-col">
        <div className="p-3 border-b border-nexus-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">MCP Servers</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="p-1.5 rounded-lg bg-nexus-accent text-white hover:bg-nexus-accent-hover"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="p-3 border-b border-nexus-border space-y-2">
            <input
              value={newServer.name}
              onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
              placeholder="Server name"
              className="input"
            />
            <input
              value={newServer.command}
              onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
              placeholder="Command (e.g. npx -y ruflo@latest mcp start)"
              className="input"
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn-primary flex-1 text-xs">
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Server list */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {servers.length === 0 && !showAddForm && (
            <p className="text-xs text-nexus-text-muted p-3 text-center">
              No MCP servers configured
            </p>
          )}
          {servers.map((server) => (
            <div key={server.id} className="rounded-lg border border-nexus-border overflow-hidden">
              <button
                onClick={() =>
                  setExpandedServer(expandedServer === server.id ? null : server.id)
                }
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-nexus-bg transition-colors"
              >
                {expandedServer === server.id ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <span
                  className={`w-2 h-2 rounded-full ${
                    server.status === "running"
                      ? "bg-green-500"
                      : server.status === "error"
                      ? "bg-red-500"
                      : "bg-nexus-text-muted"
                  }`}
                />
                <span className="text-sm flex-1 text-left">{server.name}</span>
                <span className="text-xs text-nexus-text-muted">
                  {server.tools.length} tools
                </span>
              </button>

              {expandedServer === server.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-nexus-border pt-2">
                  <div className="text-xs text-nexus-text-muted">
                    Command: {server.command.join(" ")}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleServer(server)}
                      className={`btn-primary text-xs flex items-center gap-1 ${
                        server.status === "running" ? "bg-red-600 hover:bg-red-700" : ""
                      }`}
                    >
                      {server.status === "running" ? (
                        <>
                          <Square size={12} /> Stop
                        </>
                      ) : (
                        <>
                          <Play size={12} /> Start
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => removeServer(server.id)}
                      className="btn-secondary text-xs flex items-center gap-1 text-red-400"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tool explorer */}
      <div className="flex-1 p-4">
        <h3 className="text-sm font-semibold mb-4">Tool Explorer</h3>
        {servers.length === 0 ? (
          <p className="text-sm text-nexus-text-muted">
            Add an MCP server to explore its tools
          </p>
        ) : (
          <div className="space-y-3">
            {servers.map((server) =>
              server.tools.map((tool) => (
                <div
                  key={`${server.id}-${tool.name}`}
                  className="panel p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{tool.name}</span>
                    <span className="text-xs text-nexus-text-muted">from {server.name}</span>
                  </div>
                  <p className="text-xs text-nexus-text-muted">{tool.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
