import { useState, useRef, useEffect } from "react";
import { Send, Plus } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";

export function ChatView() {
  const {
    conversations,
    activeConversation,
    streaming,
    createConversation,
    setActiveConversation,
    sendMessage,
  } = useChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConversation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    if (!activeConversation) {
      createConversation("claude-sonnet-4-20250514");
    }
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-56 border-r border-nexus-border bg-nexus-surface flex flex-col">
        <div className="p-2 border-b border-nexus-border">
          <button
            onClick={() => createConversation("claude-sonnet-4-20250514")}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                activeConversation === conv.id
                  ? "bg-nexus-accent/10 text-nexus-accent"
                  : "text-nexus-text-muted hover:bg-nexus-bg"
              }`}
            >
              {conv.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConv ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {activeConv.messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-nexus-text-muted">
                  Start a conversation
                </div>
              )}
              {activeConv.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-nexus-accent text-white"
                        : "bg-nexus-surface border border-nexus-border"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.toolCalls.map((tc) => (
                          <div
                            key={tc.id}
                            className="text-xs bg-nexus-bg rounded px-2 py-1 text-nexus-text-muted"
                          >
                            Tool: {tc.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="bg-nexus-surface border border-nexus-border rounded-xl px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-nexus-accent rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-nexus-accent rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-nexus-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-nexus-border">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                  className="input resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  className="btn-primary self-end disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-nexus-text-muted">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Nexus Chat</h2>
              <p className="text-sm">Create a new chat to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
