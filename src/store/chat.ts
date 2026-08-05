import { create } from "zustand";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface TypingState {
  [conversationId: string]: Set<string>; // employee IDs currently typing
}

interface ChatState {
  activeConversationId: string | null;
  connectionStatus: ConnectionStatus;
  typingByConversation: TypingState;
  onlineEmployeeIds: Set<string>;

  setActiveConversationId: (id: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setTyping: (conversationId: string, employeeId: string, isTyping: boolean) => void;
  setPresence: (employeeId: string, status: "online" | "offline") => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  connectionStatus: "disconnected",
  typingByConversation: {},
  onlineEmployeeIds: new Set(),

  setActiveConversationId: (id) => set({ activeConversationId: id }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setTyping: (conversationId, employeeId, isTyping) =>
    set((state) => {
      const current = new Set(state.typingByConversation[conversationId] ?? []);
      if (isTyping) current.add(employeeId);
      else current.delete(employeeId);
      return {
        typingByConversation: { ...state.typingByConversation, [conversationId]: current },
      };
    }),

  setPresence: (employeeId, status) =>
    set((state) => {
      const next = new Set(state.onlineEmployeeIds);
      if (status === "online") next.add(employeeId);
      else next.delete(employeeId);
      return { onlineEmployeeIds: next };
    }),
}));
