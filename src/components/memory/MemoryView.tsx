import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Database,
  Tag,
} from "lucide-react";
import { useMemoryStore, type MemoryEntry } from "../../stores/memoryStore";

export function MemoryView() {
  const {
    entries,
    stats,
    selectedId,
    searchQuery,
    namespaceFilter,
    isLoading,
    fetchEntries,
    fetchStats,
    selectEntry,
    setSearch,
    setNamespaceFilter,
  } = useMemoryStore();

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, []);

  const selectedEntry = entries.find((e) => e.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Entry list */}
      <div className="w-80 border-r border-nexus-border bg-nexus-surface flex flex-col">
        {/* Header + search */}
        <div className="p-3 border-b border-nexus-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Memory</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1.5 rounded-lg bg-nexus-accent text-white hover:bg-nexus-accent-hover"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-nexus-text-muted"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memory..."
              className="input pl-7 text-xs w-full"
            />
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="px-3 py-2 border-b border-nexus-border flex items-center gap-3 text-[10px] text-nexus-text-muted">
            <span className="flex items-center gap-1">
              <Database size={10} />
              {stats.total_entries} entries
            </span>
            <span>{(stats.total_size_bytes / 1024).toFixed(1)} KB</span>
            <span>{stats.namespaces.length} namespaces</span>
          </div>
        )}

        {/* Namespace filter */}
        {stats && stats.namespaces.length > 0 && (
          <div className="px-3 py-2 border-b border-nexus-border flex flex-wrap gap-1">
            <button
              onClick={() => setNamespaceFilter(null)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                !namespaceFilter
                  ? "bg-nexus-accent text-white"
                  : "bg-nexus-bg text-nexus-text-muted hover:text-nexus-text"
              }`}
            >
              All
            </button>
            {stats.namespaces.map((ns) => (
              <button
                key={ns}
                onClick={() => setNamespaceFilter(ns)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  namespaceFilter === ns
                    ? "bg-nexus-accent text-white"
                    : "bg-nexus-bg text-nexus-text-muted hover:text-nexus-text"
                }`}
              >
                {ns}
              </button>
            ))}
          </div>
        )}

        {/* Add form */}
        {showAddForm && <AddMemoryForm onClose={() => setShowAddForm(false)} />}

        {/* Entry list */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {isLoading && (
            <p className="text-xs text-nexus-text-muted p-3 text-center animate-pulse">
              Loading...
            </p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="text-xs text-nexus-text-muted p-3 text-center">
              No memory entries
            </p>
          )}
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => selectEntry(entry.id)}
              className={`w-full text-left rounded-lg border p-2 transition-colors ${
                selectedId === entry.id
                  ? "border-nexus-accent bg-nexus-accent/5"
                  : "border-nexus-border hover:bg-nexus-bg"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-bg text-nexus-text-muted font-mono">
                  {entry.namespace}
                </span>
                {entry.tags.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-nexus-text-muted">
                    <Tag size={8} />
                    {entry.tags.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-nexus-text truncate">
                {entry.content.slice(0, 80)}
                {entry.content.length > 80 ? "..." : ""}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail view */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedEntry ? (
          <EntryDetail entry={selectedEntry} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-nexus-text-muted">
            <div className="text-center">
              <Database size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select an entry to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EntryDetail({ entry }: { entry: MemoryEntry }) {
  const { updateEntry, deleteEntry } = useMemoryStore();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [tags, setTags] = useState(entry.tags.join(", "));

  const handleSave = async () => {
    await updateEntry(entry.id, content, tags.split(",").map((t) => t.trim()).filter(Boolean));
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm("Delete this memory entry?")) {
      await deleteEntry(entry.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-nexus-border bg-nexus-surface flex items-center justify-between">
        <div>
          <span className="text-xs px-2 py-0.5 rounded bg-nexus-bg text-nexus-text-muted font-mono">
            {entry.namespace}
          </span>
          <span className="text-xs text-nexus-text-muted ml-2">
            ID: {entry.id}
          </span>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} className="btn-primary text-xs">
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setContent(entry.content);
                  setTags(entry.tags.join(", "));
                }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary text-xs"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="btn-secondary text-xs text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Content */}
        <div>
          <label className="text-[10px] text-nexus-text-muted uppercase tracking-wider">
            Content
          </label>
          {editing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input mt-1 w-full h-48 font-mono text-xs resize-y"
            />
          ) : (
            <pre className="mt-1 text-sm whitespace-pre-wrap bg-nexus-bg rounded-lg p-3 font-mono">
              {entry.content}
            </pre>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] text-nexus-text-muted uppercase tracking-wider">
            Tags
          </label>
          {editing ? (
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma-separated tags"
              className="input mt-1 w-full text-xs"
            />
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.tags.length === 0 && (
                <span className="text-xs text-nexus-text-muted italic">No tags</span>
              )}
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-nexus-bg text-xs text-nexus-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Metadata */}
        {Object.keys(entry.metadata).length > 0 && (
          <div>
            <label className="text-[10px] text-nexus-text-muted uppercase tracking-wider">
              Metadata
            </label>
            <div className="mt-1 space-y-1">
              {Object.entries(entry.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-nexus-text-muted font-mono">{key}:</span>
                  <span className="text-nexus-text">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-[10px] text-nexus-text-muted space-y-1">
          <div>Created: {new Date(Number(entry.created_at)).toLocaleString()}</div>
          <div>Updated: {new Date(Number(entry.updated_at)).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

function AddMemoryForm({ onClose }: { onClose: () => void }) {
  const { addEntry } = useMemoryStore();
  const [namespace, setNamespace] = useState("default");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const handleAdd = async () => {
    if (!content.trim()) return;
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await addEntry(namespace, content, tagList);
    setContent("");
    setTags("");
    onClose();
  };

  return (
    <div className="p-3 border-b border-nexus-border space-y-2">
      <input
        value={namespace}
        onChange={(e) => setNamespace(e.target.value)}
        placeholder="Namespace"
        className="input text-xs"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Memory content..."
        className="input text-xs resize-none"
        rows={3}
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma-separated)"
        className="input text-xs"
      />
      <div className="flex gap-2">
        <button onClick={handleAdd} className="btn-primary flex-1 text-xs">
          Add
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}
