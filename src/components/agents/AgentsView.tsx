import { useEffect, useRef } from "react";
import { Square, Plus, Bot } from "lucide-react";
import { useAgentStore, type AgentInfo } from "../../stores/agentStore";
import { SpawnAgentForm } from "./SpawnAgentForm";

export function AgentsView() {
  const {
    agents,
    selectedAgentId,
    showSpawnForm,
    refreshAgents,
    selectAgent,
    killAgent,
    setShowSpawnForm,
  } = useAgentStore();

  useEffect(() => {
    refreshAgents();
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="flex h-full">
      {/* Agent list sidebar */}
      <div className="w-72 border-r border-nexus-border bg-nexus-surface flex flex-col">
        <div className="p-3 border-b border-nexus-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agents</h2>
          <button
            onClick={() => setShowSpawnForm(true)}
            className="p-1.5 rounded-lg bg-nexus-accent text-white hover:bg-nexus-accent-hover"
          >
            <Plus size={14} />
          </button>
        </div>

        {showSpawnForm && (
          <div className="border-b border-nexus-border">
            <SpawnAgentForm />
          </div>
        )}

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {agents.length === 0 && !showSpawnForm && (
            <p className="text-xs text-nexus-text-muted p-3 text-center">
              No agents running
            </p>
          )}
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgentId === agent.id}
              onSelect={() => selectAgent(agent.id)}
              onKill={() => killAgent(agent.id)}
            />
          ))}
        </div>
      </div>

      {/* Agent detail / logs */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedAgent ? (
          <AgentDetail agent={selectedAgent} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-nexus-text-muted">
            <div className="text-center">
              <Bot size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select an agent to view logs</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onSelect,
  onKill,
}: {
  agent: AgentInfo;
  isSelected: boolean;
  onSelect: () => void;
  onKill: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border p-3 cursor-pointer transition-colors ${
        isSelected
          ? "border-nexus-accent bg-nexus-accent/5"
          : "border-nexus-border hover:bg-nexus-bg"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-2 h-2 rounded-full ${
            agent.status === "running"
              ? "bg-green-500"
              : agent.status === "error"
              ? "bg-red-500"
              : "bg-nexus-text-muted"
          }`}
        />
        <span className="text-sm font-medium flex-1 truncate">{agent.name}</span>
        {agent.status === "running" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onKill();
            }}
            className="p-1 rounded text-red-400 hover:bg-red-400/10"
          >
            <Square size={12} />
          </button>
        )}
      </div>
      <div className="text-xs text-nexus-text-muted truncate">
        {agent.role} — {agent.task}
      </div>
      {agent.pid && (
        <div className="text-[10px] text-nexus-text-muted mt-1">
          PID: {agent.pid}
        </div>
      )}
    </div>
  );
}

function AgentDetail({ agent }: { agent: AgentInfo }) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agent.logs]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-nexus-border bg-nexus-surface">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              agent.status === "running"
                ? "bg-green-500"
                : agent.status === "error"
                ? "bg-red-500"
                : "bg-nexus-text-muted"
            }`}
          />
          <h3 className="text-sm font-semibold">{agent.name}</h3>
          <span className="text-xs text-nexus-text-muted capitalize">
            {agent.status}
          </span>
          {agent.pid && (
            <span className="text-xs text-nexus-text-muted">PID {agent.pid}</span>
          )}
        </div>
        <div className="text-xs text-nexus-text-muted mt-1">
          <span className="font-medium">Role:</span> {agent.role}
        </div>
        <div className="text-xs text-nexus-text-muted">
          <span className="font-medium">Task:</span> {agent.task}
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#0d1117]">
        {agent.logs.length === 0 ? (
          <div className="text-nexus-text-muted italic">No logs yet...</div>
        ) : (
          agent.logs.map((line, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                line.startsWith("[stderr]")
                  ? "text-red-400"
                  : "text-gray-300"
              }`}
            >
              {line}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
