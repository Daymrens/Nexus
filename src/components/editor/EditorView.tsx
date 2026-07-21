import { useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { FileTree } from "./FileTree";
import { EditorTabs } from "./EditorTabs";
import { MonacoEditor } from "./MonacoEditor";
import { useEditorStore } from "../../stores/editorStore";

export function EditorView() {
  const [showTree, setShowTree] = useState(true);
  const { openFiles } = useEditorStore();

  return (
    <div className="flex h-full">
      {/* File tree sidebar */}
      {showTree && (
        <div className="w-56 border-r border-nexus-border shrink-0">
          <FileTree />
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-8 flex items-center px-2 border-b border-nexus-border bg-nexus-surface gap-2">
          <button
            onClick={() => setShowTree(!showTree)}
            className="p-1 rounded text-nexus-text-muted hover:text-nexus-text hover:bg-nexus-bg"
            title="Toggle file tree"
          >
            {showTree ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
          </button>
          {openFiles.length > 0 && (
            <span className="text-[10px] text-nexus-text-muted">
              Ctrl+S to save
            </span>
          )}
        </div>

        <EditorTabs />

        <div className="flex-1 min-h-0">
          <MonacoEditor />
        </div>
      </div>
    </div>
  );
}
