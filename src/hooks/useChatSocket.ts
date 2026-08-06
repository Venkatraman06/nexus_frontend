import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ACCESS_TOKEN_KEY, useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { chatApi, type ChatMessage, type PaginatedResponse } from "@/services/chat";

type ServerEvent =
  | { type: "message:new" | "message:updated" | "message:deleted"; message: ChatMessage }
  | { type: "typing:update"; conversation_id: string; employee_id: string; is_typing: boolean }
  | { type: "presence:update"; employee_id: string; status: "online" | "offline" }
  | { type: "notification:push"; notification: unknown }
  | { type: "chat.call.update"; call: unknown };

const MAX_BACKOFF_MS = 15_000;

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
  return `${proto}//${window.location.host}/pmt/ws/chat/?token=${encodeURIComponent(token)}`;
}

export function useChatSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const setConnectionStatus = useChatStore((s) => s.setConnectionStatus);
  const setTyping = useChatStore((s) => s.setTyping);
  const setPresence = useChatStore((s) => s.setPresence);

  const upsertMessageInCache = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueriesData<PaginatedResponse<ChatMessage> | ChatMessage[]>(
        { queryKey: ["chat", "messages"] },
        (old) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            const idx = old.findIndex((m) => m.id === message.id);
            return idx === -1 ? [...old, message] : old.map((m) => (m.id === message.id ? message : m));
          }
          if ((old as any).results && Array.isArray((old as any).results)) {
            const results = (old as any).results;
            const idx = results.findIndex((m: ChatMessage) => m.id === message.id);
            const newResults = idx === -1 ? [...results, message] : results.map((m: ChatMessage) => (m.id === message.id ? message : m));
            return { ...old, results: newResults };
          }
          return old;
        }
      );
      queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    [queryClient]
  );

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "message:new":
          upsertMessageInCache(event.message);
          const activeId = useChatStore.getState().activeConversationId;
          const user = useAuthStore.getState().user;
          const senderId = typeof event.message.sender === "string" ? event.message.sender : event.message.sender?.id;
          const isFromMe = user?.id && senderId && String(senderId).toLowerCase() === String(user.id).toLowerCase();
          if (activeId && activeId === event.message.conversation && !isFromMe) {
            chatApi.markRead(event.message.conversation).catch(() => {});
          }
          break;
        case "message:updated":
        case "message:deleted":
          upsertMessageInCache(event.message);
          break;
        case "typing:update":
          setTyping(event.conversation_id, event.employee_id, event.is_typing);
          break;
        case "presence:update":
          setPresence(event.employee_id, event.status);
          break;
        case "notification:push":
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          break;
        case "chat.call.update":
          queryClient.setQueryData(["chat", "activeCall"], event.call);
          queryClient.invalidateQueries({ queryKey: ["chat", "callHistory"] });
          break;
      }
    },
    [upsertMessageInCache, setTyping, setPresence, queryClient]
  );

  const send = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setConnectionStatus("connecting");
      const socket = new WebSocket(wsUrl());
      socketRef.current = socket;
      let pingInterval: any = null;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setConnectionStatus("connected");
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "presence:ping" }));
        }
        pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "presence:ping" }));
          }
        }, 15000);
      };

      socket.onmessage = (evt) => {
        try {
          handleEvent(JSON.parse(evt.data));
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        setConnectionStatus("disconnected");
        if (cancelled) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, MAX_BACKOFF_MS);
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        if (pingInterval) clearInterval(pingInterval);
        socket.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [handleEvent, setConnectionStatus]);

  const startTyping = useCallback((conversationId: string) => send({ type: "typing:start", conversation: conversationId }), [send]);
  const stopTyping = useCallback((conversationId: string) => send({ type: "typing:stop", conversation: conversationId }), [send]);

  return { startTyping, stopTyping };
}
