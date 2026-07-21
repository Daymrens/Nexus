import { useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useTerminalStore } from "../../stores/terminalStore";
import { TerminalInstance } from "./TerminalInstance";

export function TerminalView() {
  const { tabs, activeTab, createTab, closeTab, setActiveTab } =
    useTerminalStore();

  useEffect(() => {
    if (tabs.length === 0) {
      createTab();
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-nexus-border bg-nexus-surface">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-nexus-border transition-colors ${
                activeTab === tab.id
                  ? "bg-[#0d1117] text-nexus-text"
                  : "text-nexus-text-muted hover:bg-nexus-bg/50"
              }`}
            >
              <span>{tab.title}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-nexus-border rounded"
              >
                <X size={10} />
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => createTab()}
          className="p-1.5 text-nexus-text-muted hover:text-nexus-text hover:bg-nexus-bg"
          title="New Terminal"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${
              activeTab === tab.id ? "block" : "hidden"
            }`}
          >
            <TerminalInstance
              terminalId={tab.id}
              isActive={activeTab === tab.id}
            />
          </div>
        ))}
        {tabs.length === 0 && (
          <div className="flex items-center justify-center h-full text-nexus-text-muted text-sm">
            Click + to open a terminal
          </div>
        )}
      </div>
    </div>
  );
}
