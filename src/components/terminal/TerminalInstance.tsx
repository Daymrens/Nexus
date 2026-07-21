import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { useTerminalStore } from "../../stores/terminalStore";

interface Props {
  terminalId: string;
  isActive: boolean;
}

export function TerminalInstance({ terminalId, isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const writeToTab = useTerminalStore((s) => s.writeToTab);

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        cursorAccent: "#0d1117",
        selectionBackground: "#264f78",
        black: "#484f58",
        red: "#ff7b72",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);
    fitAddon.fit();

    // Store reference for output writing
    (containerRef.current as unknown as { __xterm__: Terminal }).__xterm__ = term;

    // Handle user input
    term.onData((data) => {
      writeToTab(terminalId, data);
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Store xterm ref on the element for the event listener
    const el = document.getElementById(`xterm-${terminalId}`);
    if (el) {
      (el as unknown as { __xterm__: Terminal }).__xterm__ = term;
    }
  }, [terminalId, writeToTab]);

  useEffect(() => {
    initTerminal();

    const observer = new ResizeObserver(() => {
      fitAddonRef.current?.fit();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      termRef.current?.dispose();
      termRef.current = null;
    };
  }, [initTerminal]);

  // Focus when active
  useEffect(() => {
    if (isActive && termRef.current) {
      termRef.current.focus();
    }
  }, [isActive]);

  return (
    <div
      id={`xterm-${terminalId}`}
      ref={containerRef}
      className="w-full h-full"
    />
  );
}
