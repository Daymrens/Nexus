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
  loadConversations: () => Promise<void>;
  saveConversations: () => Promise<void>;
}

let unlistenToken: UnlistenFn | null = null;

function persist(state: ChatState) {
  invoke("chat_save_conversations", {
    conversations: JSON.stringify(state.conversations),
  }).catch((e) => console.error("Failed to save conversations:", e));
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  streamingContent: "",

  loadConversations: async () => {
    try {
      const data = (await invoke("chat_load_conversations")) as string;
      const conversations = JSON.parse(data) as Conversation[];
      if (conversations.length > 0) {
        set({ conversations, activeConversationId: conversations[0].id });
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  },

  saveConversations: async () => {
    persist(get());
  },

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
    set((s) => {
      const next = {
        conversations: [conv, ...s.conversations],
        activeConversationId: id,
      };
      persist({ ...s, ...next });
      return next;
    });
    return id;
  },

  deleteConversation: (id) =>
    set((s) => {
      const remaining = s.conversations.filter((c) => c.id !== id);
      const next = {
        conversations: remaining,
        activeConversationId:
          s.activeConversationId === id
            ? remaining[0]?.id ?? null
            : s.activeConversationId,
      };
      persist({ ...s, ...next });
      return next;
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  updateConversationTitle: (id, title) =>
    set((s) => {
      const next = {
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      };
      persist({ ...s, ...next });
      return next;
    }),

  updateSystemPrompt: (id, prompt) =>
    set((s) => {
      const next = {
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, systemPrompt: prompt } : c
        ),
      };
      persist({ ...s, ...next });
      return next;
    }),

  updateProvider: (id, provider) =>
    set((s) => {
      const next = {
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, provider } : c
        ),
      };
      persist({ ...s, ...next });
      return next;
    }),

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
          // Persist after streaming completes
          setTimeout(() => persist(get()), 100);
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
