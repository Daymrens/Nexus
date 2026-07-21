import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useEditorStore } from "../../stores/editorStore";

export function MonacoEditor() {
  const { openFiles, activeFile, updateContent, saveFile } = useEditorStore();
  const editorRef = useRef<unknown>(null);

  const file = openFiles.find((f) => f.path === activeFile);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeFile) saveFile(activeFile);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFile, saveFile]);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-nexus-text-muted text-sm">
        Open a file from the tree
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={file.language}
      value={file.content}
      theme="vs-dark"
      onChange={(value) => {
        if (value !== undefined && activeFile) {
          updateContent(activeFile, value);
        }
      }}
      onMount={(editor) => {
        editorRef.current = editor;
      }}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        minimap: { enabled: true, maxColumn: 80 },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        lineNumbers: "on",
        renderWhitespace: "selection",
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 8 },
      }}
    />
  );
}
