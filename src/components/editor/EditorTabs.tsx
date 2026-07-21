import { X } from "lucide-react";
import { useEditorStore } from "../../stores/editorStore";

export function EditorTabs() {
  const { openFiles, activeFile, setActiveFile, closeFile } = useEditorStore();

  if (openFiles.length === 0) return null;

  return (
    <div className="flex border-b border-nexus-border bg-nexus-surface overflow-x-auto">
      {openFiles.map((file) => (
        <button
          key={file.path}
          onClick={() => setActiveFile(file.path)}
          className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-nexus-border min-w-0 max-w-[160px] transition-colors ${
            activeFile === file.path
              ? "bg-nexus-bg text-nexus-text"
              : "text-nexus-text-muted hover:bg-nexus-bg/50"
          }`}
        >
          {file.modified && (
            <span className="w-1.5 h-1.5 rounded-full bg-nexus-accent shrink-0" />
          )}
          <span className="truncate">{file.name}</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.path);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-nexus-border rounded shrink-0"
          >
            <X size={10} />
          </span>
        </button>
      ))}
    </div>
  );
}
