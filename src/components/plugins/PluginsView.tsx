import { useEffect } from "react";
import {
  Search,
  Download,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  ArrowDownToLine,
} from "lucide-react";
import { usePluginStore, type PluginRegistryEntry } from "../../stores/pluginStore";

const CATEGORIES = ["all", "agents", "memory", "tools", "integrations", "ai"];

export function PluginsView() {
  const {
    registry,
    installed,
    isLoading,
    categoryFilter,
    searchQuery,
    fetchRegistry,
    fetchInstalled,
    install,
    uninstall,
    toggle,
    setCategoryFilter,
    setSearch,
  } = usePluginStore();

  useEffect(() => {
    fetchRegistry();
    fetchInstalled();
  }, []);

  const isInstalled = (id: string) => installed.some((p) => p.id === id);
  const getInstalled = (id: string) => installed.find((p) => p.id === id);

  const filtered = registry.filter((r) => {
    if (categoryFilter && categoryFilter !== "all" && r.category !== categoryFilter)
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !r.name.toLowerCase().includes(q) &&
        !r.description.toLowerCase().includes(q) &&
        !r.author.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-nexus-border bg-nexus-surface space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Plugin Marketplace</h2>
          <span className="text-[10px] text-nexus-text-muted">
            {installed.length} installed / {registry.length} available
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-nexus-text-muted"
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="input pl-7 text-xs w-full"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === "all" ? null : cat)}
              className={`px-2.5 py-1 rounded text-[10px] capitalize transition-colors ${
                (categoryFilter === null && cat === "all") ||
                categoryFilter === cat
                  ? "bg-nexus-accent text-white"
                  : "bg-nexus-bg text-nexus-text-muted hover:text-nexus-text"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin grid */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <p className="text-xs text-nexus-text-muted text-center animate-pulse py-8">
            Loading registry...
          </p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-xs text-nexus-text-muted text-center py-8">
            No plugins found
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((entry) => {
            const installedPlugin = getInstalled(entry.id);
            const installed = isInstalled(entry.id);
            return (
              <PluginCard
                key={entry.id}
                entry={entry}
                installed={installed}
                enabled={installedPlugin?.enabled ?? false}
                onInstall={() => install(entry.id)}
                onUninstall={() => uninstall(entry.id)}
                onToggle={(enabled) => toggle(entry.id, enabled)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PluginCard({
  entry,
  installed,
  enabled,
  onInstall,
  onUninstall,
  onToggle,
}: {
  entry: PluginRegistryEntry;
  installed: boolean;
  enabled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3 space-y-2 hover:border-nexus-accent/30 transition-colors">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium truncate">{entry.name}</h3>
          <p className="text-[10px] text-nexus-text-muted">
            by {entry.author} · v{entry.version}
          </p>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] bg-nexus-bg text-nexus-text-muted capitalize shrink-0">
          {entry.category}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-nexus-text-muted line-clamp-2">
        {entry.description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-nexus-text-muted">
        <span className="flex items-center gap-1">
          <Star size={10} />
          {entry.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <ArrowDownToLine size={10} />
          {entry.downloads.toLocaleString()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {installed ? (
          <>
            <button
              onClick={() => onToggle(!enabled)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                enabled
                  ? "bg-green-500/10 text-green-400"
                  : "bg-nexus-bg text-nexus-text-muted"
              }`}
            >
              {enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
              {enabled ? "Enabled" : "Disabled"}
            </button>
            <button
              onClick={onUninstall}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 size={10} />
              Uninstall
            </button>
          </>
        ) : (
          <button
            onClick={onInstall}
            className="flex items-center gap-1 px-3 py-1 rounded text-[10px] bg-nexus-accent text-white hover:bg-nexus-accent-hover"
          >
            <Download size={10} />
            Install
          </button>
        )}
      </div>
    </div>
  );
}
