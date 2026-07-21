import { useRef, useEffect } from "react";
import type { ChatMessage } from "../../stores/chatStore";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-nexus-text-muted text-sm">
          Send a message to start
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1].content === "" && (
          <div className="flex justify-start">
            <div className="bg-nexus-surface border border-nexus-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-nexus-accent rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-nexus-accent rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-1.5 h-1.5 bg-nexus-accent rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      <div ref={endRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isError = message.content.startsWith("Error:");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-nexus-accent text-white"
            : isError
            ? "bg-red-900/20 border border-red-800/50 text-red-300"
            : "bg-nexus-surface border border-nexus-border"
        }`}
      >
        {!isUser && message.model && (
          <div className="text-[10px] text-nexus-text-muted mb-1 opacity-60">
            {message.model}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content || (
            <span className="text-nexus-text-muted italic">...</span>
          )}
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc) => (
              <div
                key={tc.id}
                className="text-xs bg-nexus-bg rounded px-2 py-1 text-nexus-text-muted font-mono"
              >
                {tc.name}({tc.arguments.slice(0, 60)}
                {tc.arguments.length > 60 ? "..." : ""})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
