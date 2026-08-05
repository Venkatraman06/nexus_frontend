import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ACCESS_TOKEN_KEY } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import type { ChatMessage, PaginatedResponse } from "@/services/chat";

type ServerEvent =
  | { type: "message:new" | "message:updated" | "message:deleted"; message: ChatMessage }
  | { type: "typing:update"; conversation_id: string; employee_id: string; is_typing: boolean }
  | { type: "presence:update"; employee_id: string; status: "online" | "offline" }
  | { type: "notification:push"; notification: unknown };

const MAX_BACKOFF_MS = 15_000;

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
  return `${proto}//${window.location.host}/bms/ws/chat/?token=${encodeURIComponent(token)}`;
}

/**
 * Owns one WebSocket connection for the lifetime of the mounting component
 * (intended to be called once, from ChatPage). Sending happens over REST
 * (chatApi) so it works the same with or without a live socket and covers
 * attachments; this hook only handles the live inbound stream — new/edited/
 * deleted messages, typing, presence — by writing into the TanStack Query
 * cache and the chat Zustand store, plus exposes typing-indicator senders.
 */
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
      queryClient.setQueriesData<PaginatedResponse<ChatMessage>>(
        { queryKey: ["chat", "messages", message.conversation] },
        (old) => {
          if (!old) return old;
          const idx = old.results.findIndex((m) => m.id === message.id);
          const results =
            idx === -1
              ? [...old.results, message]
              : old.results.map((m) => (m.id === message.id ? message : m));
          return { ...old, results };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    [queryClient]
  );

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "message:new":
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

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setConnectionStatus("connected");
      };

      socket.onmessage = (evt) => {
        try {
          handleEvent(JSON.parse(evt.data));
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        setConnectionStatus("disconnected");
        if (cancelled) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, MAX_BACKOFF_MS);
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
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
