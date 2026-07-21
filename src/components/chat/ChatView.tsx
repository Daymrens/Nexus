import { useState } from "react";
import {
  ChevronDown,
  Trash2,
  Square,
} from "lucide-react";
import { useChatStore, type ProviderConfig, type ProviderType } from "../../stores/chatStore";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ModelSelector } from "./ModelSelector";

const DEFAULT_PROVIDERS: Record<ProviderType, ProviderConfig> = {
  anthropic: {
    type: "anthropic",
    apiKey: "",
    model: "claude-sonnet-4-20250514",
  },
  openai: {
    type: "openai",
    apiKey: "",
    model: "gpt-4o",
  },
  ollama: {
    type: "ollama",
    apiKey: "ollama",
    model: "llama3.2",
    baseUrl: "http://localhost:11434/v1",
  },
};

export function ChatView() {
  const {
    conversations,
    activeConversationId,
    isStreaming,
    createConversation,
    deleteConversation,
    setActiveConversation,
    sendMessage,
    stopStreaming,
    updateProvider,
  } = useChatStore();

  const [showModelSelector, setShowModelSelector] = useState(false);
  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const handleNewChat = () => {
    createConversation(DEFAULT_PROVIDERS.anthropic);
  };

  const handleSend = (content: string) => {
    if (!activeConversationId) {
      const id = createConversation(DEFAULT_PROVIDERS.anthropic);
      setTimeout(() => sendMessage(id, content), 50);
    } else {
      sendMessage(activeConversationId, content);
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="w-56 border-r border-nexus-border bg-nexus-surface flex flex-col">
        <div className="p-2 border-b border-nexus-border">
          <button onClick={handleNewChat} className="btn-primary w-full text-sm">
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-0.5">
          {conversations.map((conv) => (
            <div key={conv.id} className="group flex items-center">
              <button
                onClick={() => setActiveConversation(conv.id)}
                className={`flex-1 text-left px-2 py-1.5 rounded text-xs truncate transition-colors ${
                  activeConversationId === conv.id
                    ? "bg-nexus-accent/10 text-nexus-accent"
                    : "text-nexus-text-muted hover:bg-nexus-bg"
                }`}
              >
                {conv.title}
              </button>
              <button
                onClick={() => deleteConversation(conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-nexus-text-muted hover:text-red-400 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConv ? (
          <>
            {/* Header bar */}
            <div className="h-10 border-b border-nexus-border flex items-center px-3 gap-2 bg-nexus-surface">
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className="flex items-center gap-1.5 text-xs text-nexus-text-muted hover:text-nexus-text transition-colors"
              >
                <span className="font-medium">{activeConv.provider.model}</span>
                <ChevronDown size={12} />
              </button>
              <span className="text-nexus-border">|</span>
              <span className="text-xs text-nexus-text-muted capitalize">
                {activeConv.provider.type}
              </span>
              {isStreaming && (
                <>
                  <span className="text-nexus-border">|</span>
                  <button
                    onClick={stopStreaming}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <Square size={10} /> Stop
                  </button>
                </>
              )}
            </div>

            {/* Model selector dropdown */}
            {showModelSelector && (
              <ModelSelector
                current={activeConv.provider}
                onChange={(p) => updateProvider(activeConv.id, p)}
                onClose={() => setShowModelSelector(false)}
              />
            )}

            {/* Messages */}
            <MessageList
              messages={activeConv.messages}
              isStreaming={isStreaming}
            />

            {/* Input */}
            <MessageInput
              onSend={handleSend}
              disabled={isStreaming}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Nexus Chat</h2>
              <p className="text-sm text-nexus-text-muted mb-4">
                Multi-model AI chat with MCP tool integration
              </p>
              <button onClick={handleNewChat} className="btn-primary">
                Start a Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
