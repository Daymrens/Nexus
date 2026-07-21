import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: string | null;
  streaming: boolean;
  createConversation: (model: string) => string;
  setActiveConversation: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  setStreaming: (streaming: boolean) => void;
}

let nextId = 1;

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  streaming: false,

  createConversation: (model) => {
    const id = `conv-${nextId++}`;
    const conv: Conversation = {
      id,
      title: "New Chat",
      model,
      messages: [],
      createdAt: Date.now(),
    };
    set((s) => ({
      conversations: [...s.conversations, conv],
      activeConversation: id,
    }));
    return id;
  },

  setActiveConversation: (id) => set({ activeConversation: id }),

  sendMessage: async (content) => {
    const { activeConversation, conversations } = get();
    if (!activeConversation) return;

    const conv = conversations.find((c) => c.id === activeConversation);
    if (!conv) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === activeConversation
          ? { ...c, messages: [...c.messages, userMsg] }
          : c
      ),
    }));

    // Placeholder — real implementation will call LLM providers
    set({ streaming: true });
    setTimeout(() => {
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "Nexus chat is not yet connected to an AI provider. Configure a provider in Settings to start chatting.",
        timestamp: Date.now(),
      };
      set((s) => ({
        streaming: false,
        conversations: s.conversations.map((c) =>
          c.id === activeConversation
            ? { ...c, messages: [...c.messages, assistantMsg] }
            : c
        ),
      }));
    }, 500);
  },

  setStreaming: (streaming) => set({ streaming }),
}));
