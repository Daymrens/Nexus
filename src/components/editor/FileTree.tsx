import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useEditorStore, type FileEntry } from "../../stores/editorStore";

export function FileTree() {
  const { fileTree, rootPath, setRootPath, refreshFileTree, toggleDir, openFile } =
    useEditorStore();

  const handleFolderPicker = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Folder",
    });
    if (selected) {
      setRootPath(selected as string);
    }
  };

  return (
    <div className="h-full flex flex-col bg-nexus-surface">
      <div className="p-2 border-b border-nexus-border flex items-center justify-between">
        <span className="text-xs font-semibold">Files</span>
        <div className="flex gap-1">
          <button
            onClick={refreshFileTree}
            className="p-1 rounded text-nexus-text-muted hover:text-nexus-text hover:bg-nexus-bg"
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {!rootPath ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <button onClick={handleFolderPicker} className="btn-primary text-xs">
            Open Folder
          </button>
        </div>
      ) : (
        <>
          <div className="px-2 py-1.5 text-[10px] text-nexus-text-muted truncate border-b border-nexus-border font-mono">
            {rootPath}
          </div>
          <div className="flex-1 overflow-auto p-1">
            {fileTree.map((entry) => (
              <FileNode
                key={entry.path}
                entry={entry}
                onToggle={toggleDir}
                onOpen={openFile}
                depth={0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FileNode({
  entry,
  onToggle,
  onOpen,
  depth,
}: {
  entry: FileEntry;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
  depth: number;
}) {
  const indent = depth * 12;

  if (entry.isDir) {
    return (
      <div>
        <button
          onClick={() => onToggle(entry.path)}
          className="w-full flex items-center gap-1 px-1 py-0.5 text-xs hover:bg-nexus-bg rounded transition-colors"
          style={{ paddingLeft: indent + 4 }}
        >
          {entry.expanded ? (
            <ChevronDown size={12} className="text-nexus-text-muted shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-nexus-text-muted shrink-0" />
          )}
          {entry.expanded ? (
            <FolderOpen size={14} className="text-yellow-500 shrink-0" />
          ) : (
            <Folder size={14} className="text-yellow-500 shrink-0" />
          )}
          <span className="truncate">{entry.name}</span>
        </button>
        {entry.expanded && entry.children && (
          <div>
            {entry.children.map((child) => (
              <FileNode
                key={child.path}
                entry={child}
                onToggle={onToggle}
                onOpen={onOpen}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpen(entry.path)}
      className="w-full flex items-center gap-1 px-1 py-0.5 text-xs hover:bg-nexus-bg rounded transition-colors"
      style={{ paddingLeft: indent + 16 }}
    >
      <File size={14} className="text-nexus-text-muted shrink-0" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}
