import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ── Types ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  provider?: string;
  model?: string;
  toolCalls?: ToolCallInfo[];
  toolCallId?: string;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

export type ProviderType = "anthropic" | "openai" | "ollama";

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  provider: ProviderConfig;
  createdAt: number;
  updatedAt: number;
  systemPrompt: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string;

  // Actions
  createConversation: (provider: ProviderConfig) => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  updateSystemPrompt: (id: string, prompt: string) => void;
  updateProvider: (id: string, provider: ProviderConfig) => void;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  stopStreaming: () => void;
}

let unlistenToken: UnlistenFn | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  streamingContent: "",

  createConversation: (provider) => {
    const id = `conv-${Date.now()}`;
    const conv: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      provider,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      systemPrompt: "You are a helpful coding assistant.",
    };
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeConversationId: id,
    }));
    return id;
  },

  deleteConversation: (id) =>
    set((s) => {
      const remaining = s.conversations.filter((c) => c.id !== id);
      return {
        conversations: remaining,
        activeConversationId:
          s.activeConversationId === id
            ? remaining[0]?.id ?? null
            : s.activeConversationId,
      };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  updateConversationTitle: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    })),

  updateSystemPrompt: (id, prompt) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, systemPrompt: prompt } : c
      ),
    })),

  updateProvider: (id, provider) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, provider } : c
      ),
    })),

  sendMessage: async (conversationId, content) => {
    const state = get();
    const conv = state.conversations.find((c) => c.id === conversationId);
    if (!conv || state.isStreaming) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const placeholderMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      provider: conv.provider.type,
      model: conv.provider.model,
    };

    set((s) => ({
      isStreaming: true,
      streamingContent: "",
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, userMsg, placeholderMsg],
              updatedAt: Date.now(),
              title:
                c.messages.length === 0
                  ? content.slice(0, 50) + (content.length > 50 ? "..." : "")
                  : c.title,
            }
          : c
      ),
    }));

    // Set up event listener for streaming tokens
    if (unlistenToken) {
      unlistenToken();
      unlistenToken = null;
    }

    unlistenToken = await listen<{ event_type: string; content: string; done: boolean }>(
      "chat://token",
      (event) => {
        const { content: token, done } = event.payload;
        if (done) {
          set({ isStreaming: false, streamingContent: "" });
          if (unlistenToken) {
            unlistenToken();
            unlistenToken = null;
          }
          return;
        }
        set((s) => {
          const newContent = s.streamingContent + token;
          return {
            streamingContent: newContent,
            conversations: s.conversations.map((c) => {
              if (c.id !== conversationId) return c;
              const msgs = [...c.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === "assistant") {
                msgs[msgs.length - 1] = { ...last, content: newContent };
              }
              return { ...c, messages: msgs };
            }),
          };
        });
      }
    );

    // Build messages for the API
    const apiMessages = conv.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      await invoke("chat_send", {
        request: {
          provider: {
            provider: conv.provider.type,
            api_key: conv.provider.apiKey,
            model: conv.provider.model,
            base_url: conv.provider.baseUrl || null,
          },
          messages: apiMessages,
          tools: [],
          max_tokens: 4096,
          system_prompt: conv.systemPrompt || null,
        },
        conversationId,
      });
    } catch (e) {
      const errorMsg = String(e);
      set((s) => ({
        isStreaming: false,
        streamingContent: "",
        conversations: s.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const msgs = [...c.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
            msgs[lastIdx] = {
              ...msgs[lastIdx],
              content: `Error: ${errorMsg}`,
            };
          }
          return { ...c, messages: msgs };
        }),
      }));
    }

    if (unlistenToken) {
      unlistenToken();
      unlistenToken = null;
    }
  },

  stopStreaming: () => {
    set({ isStreaming: false, streamingContent: "" });
    if (unlistenToken) {
      unlistenToken();
      unlistenToken = null;
    }
  },
}));
