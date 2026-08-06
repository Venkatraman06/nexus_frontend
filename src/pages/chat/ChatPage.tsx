import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Drawer, Input, List, Avatar, Button, Modal, Spin, message as toast } from "antd";
import {
  SearchOutlined, TeamOutlined, UserAddOutlined, CloseOutlined, DeleteOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { useChatSocket } from "@/hooks/useChatSocket";
import { chatApi, ChatMessage, ConversationListItem } from "@/services/chat";

import ChatSidebar from "./components/ChatSidebar";
import ChatHeader from "./components/ChatHeader";
import MessageBubble from "./components/MessageBubble";
import ChatInputBar from "./components/ChatInputBar";
import PinnedMessageBanner from "./components/PinnedMessageBanner";
import NewChatModal from "./components/NewChatModal";
import MessageInfoModal from "./components/MessageInfoModal";
import { CallOverlayModal } from "./components/CallOverlayModal";
import { IncomingCallModal } from "./components/IncomingCallModal";
import { callSounds } from "@/utils/callSounds";
import { useThemeStore } from "@/store/theme";

dayjs.extend(relativeTime);

export const ChatPage: React.FC = () => {
  const isDark = useThemeStore((s) => s.isDark);
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { startTyping, stopTyping } = useChatSocket();

  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const onlineEmployeeIds = useChatStore((s) => s.onlineEmployeeIds);

  const getUserStorageKey = (key: string) => `pmt_${myId || "anon"}_${key}`;

  // Local Conversations State with localStorage Persistence (User-Scoped)
  const [localConversations, setLocalConversations] = useState<ConversationListItem[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(getUserStorageKey("custom_conversations")) || "[]");
      return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c === "object" && c.id) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!myId) return;
    try {
      localStorage.setItem(getUserStorageKey("custom_conversations"), JSON.stringify(localConversations));
    } catch (e) {}
  }, [localConversations, myId]);

  // Local Messages Map with localStorage Persistence (User-Scoped)
  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(getUserStorageKey("local_messages")) || "{}");
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!myId) return;
    try {
      localStorage.setItem(getUserStorageKey("local_messages"), JSON.stringify(localMessagesMap));
    } catch (e) {}
  }, [localMessagesMap, myId]);

  // Lock body & html scrolling so page is 100% fixed and unmoveable
  useEffect(() => {
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, []);

  // Modal / Drawer states
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<"VOICE" | "VIDEO">("VOICE");
  const [messageInfoOpen, setMessageInfoOpen] = useState(false);
  const [selectedMessageInfo, setSelectedMessageInfo] = useState<ChatMessage | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  // Search inside active chat
  const [showSearchInChat, setShowSearchInChat] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState("");

  // Pinned chats and messages state (User-Scoped)
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(getUserStorageKey("pinned_chats")) || "[]");
    } catch {
      return [];
    }
  });

  const [pinnedMessagesByConv, setPinnedMessagesByConv] = useState<Record<string, ChatMessage>>(() => {
    try {
      return JSON.parse(localStorage.getItem(getUserStorageKey("pinned_messages")) || "{}");
    } catch {
      return {};
    }
  });

  // Local cleared chats timestamp map (User-Scoped)
  const [clearedConvTimestamps, setClearedConvTimestamps] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(getUserStorageKey("cleared_timestamps")) || "{}");
    } catch {
      return {};
    }
  });

  const [deletedForMeIds, setDeletedForMeIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(getUserStorageKey("deleted_for_me")) || "[]");
    } catch {
      return [];
    }
  });

  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);

  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  // Fetch Conversations List from API (live refetch every 2 seconds)
  const conversationsQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => chatApi.listConversations().catch(() => []),
    refetchInterval: 2000,
  });

  // Live Active Call Polling every 1 second
  const activeCallQuery = useQuery({
    queryKey: ["chat", "activeCall"],
    queryFn: () => chatApi.getActiveCall().catch(() => null),
    refetchInterval: 1000,
  });

  const activeCall = activeCallQuery.data;

  // Live Call History Query
  const callHistoryQuery = useQuery({
    queryKey: ["chat", "callHistory"],
    queryFn: () => chatApi.listCallHistory().catch(() => []),
    refetchInterval: 5000,
  });

  const callHistory = callHistoryQuery.data || [];

  // Merge server list and local conversations dynamically
  const conversations: ConversationListItem[] = useMemo(() => {
    const rawData = conversationsQuery.data;
    const serverList: ConversationListItem[] = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.results)
      ? rawData.results
      : [];

    const map = new Map<string, ConversationListItem>();
    if (Array.isArray(localConversations)) {
      localConversations.forEach((c) => {
        if (c && c.id) map.set(c.id, c);
      });
    }
    if (Array.isArray(serverList)) {
      serverList.forEach((c) => {
        if (c && c.id) map.set(c.id, c);
      });
    }
    return Array.from(map.values());
  }, [conversationsQuery.data, localConversations]);

  // Automatically select first conversation if none selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, setActiveConversationId]);

  // Automatically resolve synthetic direct conversation IDs to permanent server UUIDs
  useEffect(() => {
    if (activeConversationId && activeConversationId.startsWith("direct_")) {
      const empIdOrCode = activeConversationId.replace("direct_", "");
      const matchingServerConv = conversations.find(
        (c) =>
          c.type === "DIRECT" &&
          !c.id.startsWith("direct_") &&
          c.participants?.some(
            (p) =>
              p.employee?.id === empIdOrCode ||
              ((p.employee as any)?.employee_code && (p.employee as any).employee_code.toLowerCase() === empIdOrCode.toLowerCase())
          )
      );
      if (matchingServerConv && matchingServerConv.id) {
        const syntheticId = activeConversationId;
        const realId = matchingServerConv.id;
        setLocalMessagesMap((prev) => {
          const syntheticMsgs = prev[syntheticId] || [];
          if (syntheticMsgs.length > 0) {
            const realMsgs = prev[realId] || [];
            return {
              ...prev,
              [realId]: [...realMsgs, ...syntheticMsgs],
            };
          }
          return prev;
        });
        setActiveConversationId(realId);
      }
    }
  }, [activeConversationId, conversations, setActiveConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Fetch Server Messages for Active Conversation
  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", activeConversationId],
    queryFn: () => {
      if (!activeConversationId) return [];
      return chatApi
        .listMessages(activeConversationId)
        .catch(() => []);
    },
    enabled: !!activeConversationId,
    placeholderData: (prev) => prev,
    staleTime: 3000,
    refetchInterval: 4000,
  });

  const rawServerMessages: ChatMessage[] = useMemo(() => {
    if (!messagesQuery.data) return [];
    if (Array.isArray(messagesQuery.data)) return messagesQuery.data;
    if (Array.isArray((messagesQuery.data as any).results)) return (messagesQuery.data as any).results;
    return [];
  }, [messagesQuery.data]);

  // Combine Server Messages + Local Sent Messages
  const messages: ChatMessage[] = useMemo(() => {
    if (!activeConversationId) return [];

    const syntheticMsgs = localMessagesMap[activeConversationId] || [];
    let realConvId = activeConversationId;
    if (activeConversationId.startsWith("direct_")) {
      const empIdOrCode = activeConversationId.replace("direct_", "");
      const matchingServerConv = conversations.find(
        (c) =>
          c.type === "DIRECT" &&
          !c.id.startsWith("direct_") &&
          c.participants?.some(
            (p) =>
              p.employee?.id === empIdOrCode ||
              ((p.employee as any)?.employee_code && (p.employee as any).employee_code.toLowerCase() === empIdOrCode.toLowerCase())
          )
      );
      if (matchingServerConv) {
        realConvId = matchingServerConv.id;
      }
    }
    const realMsgs = localMessagesMap[realConvId] || [];
    const localMsgs = Array.from(new Set([...syntheticMsgs, ...realMsgs]));
    const clearedTime = clearedConvTimestamps[activeConversationId] || clearedConvTimestamps[realConvId];

    // Deduplicate by ID and content match
    const map = new Map<string, ChatMessage>();
    rawServerMessages.forEach((m) => {
      if (m && m.id) map.set(m.id, m);
    });

    localMsgs.forEach((lm) => {
      if (!lm || !lm.id) return;
      const lmClean = (lm.body || "").trim().replace(/^>\s*/, "");
      const isAlreadyOnServer = rawServerMessages.some((sm) => {
        if (!sm) return false;
        if (sm.id === lm.id) return true;
        const smClean = (sm.body || "").trim().replace(/^>\s*/, "");
        const sameBody = smClean === lmClean || (smClean.length > 5 && (smClean.includes(lmClean) || lmClean.includes(smClean)));
        const smSenderId = typeof sm.sender === "string" ? sm.sender : sm.sender?.id;
        const lmSenderId = typeof lm.sender === "string" ? lm.sender : lm.sender?.id;
        const sameSender = !smSenderId || !lmSenderId || String(smSenderId).toLowerCase() === String(lmSenderId).toLowerCase();
        return sameBody && sameSender;
      });
      if (!isAlreadyOnServer) {
        map.set(lm.id, lm);
      }
    });

    const clearedMs = clearedTime ? new Date(clearedTime).getTime() : 0;

    let combined = Array.from(map.values())
      .filter((m) => {
        if (!m || !m.id) return false;
        if (deletedForMeIds.includes(m.id)) return false;
        if (clearedMs > 0) {
          const msgMs = new Date(m.created_at).getTime();
          if (!isNaN(msgMs) && msgMs <= clearedMs) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    if (searchInChatQuery.trim()) {
      combined = combined.filter((m) =>
        m.body?.toLowerCase().includes(searchInChatQuery.toLowerCase())
      );
    }
    return combined;
  }, [rawServerMessages, localMessagesMap, clearedConvTimestamps, deletedForMeIds, activeConversationId, searchInChatQuery, myId]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottomInstant = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // WhatsApp style instant bottom scroll on chat select or message load
  useLayoutEffect(() => {
    if (!activeConversationId || messages.length === 0) return;
    scrollToBottomInstant();
    const raf = requestAnimationFrame(scrollToBottomInstant);
    return () => cancelAnimationFrame(raf);
  }, [activeConversationId, messages.length, scrollToBottomInstant]);

  // Mark read when opening conversation
  useEffect(() => {
    if (activeConversationId) {
      if (!activeConversationId.startsWith("direct_") && !activeConversationId.startsWith("group_") && !activeConversationId.startsWith("project_")) {
        chatApi.markRead(activeConversationId).catch(() => {});
      }
      setLocalConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, unread_count: 0 } : c))
      );
    }
  }, [activeConversationId]);

  // Handle selecting or creating a conversation from NewChatModal
  const handleSelectOrCreateConversation = (conv: ConversationListItem) => {
    setLocalConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== conv.id);
      return [{ ...conv, unread_count: 0 }, ...filtered];
    });
    setActiveConversationId(conv.id);
  };

  // Central message sender helper
  const handleAddMessageToState = (bodyText: string, attachments: any[] = [], replyToId: string | null = null) => {
    if (!activeConversationId) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversation: activeConversationId,
      sender: user ? {
        id: user.id,
        full_name: user.full_name || user.username || "Staff Member",
        email: user.email || "",
        profile_picture_url: user.profile_picture_url || null,
      } : {
        id: "me",
        full_name: "Staff Member",
        email: "",
        profile_picture_url: null,
      },
      body: bodyText,
      reply_to: replyToId,
      is_edited: false,
      edited_at: null,
      is_important: false,
      is_deleted: false,
      mentioned_employee_ids: [],
      attachments: attachments,
      is_starred_by_me: false,
      reaction_summary: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Instantly append message to local messages map for active conversation
    setLocalMessagesMap((prev) => {
      const currentList = prev[activeConversationId] || [];
      return {
        ...prev,
        [activeConversationId]: [...currentList, newMsg],
      };
    });

    // 2. Instantly update last message preview in sidebar and keep unread_count = 0 for sender
    let previewText = bodyText;
    if (previewText.startsWith("{")) {
      try {
        const parsed = JSON.parse(previewText);
        if (parsed.type === "VOICE_NOTE") previewText = "🎙️ Voice Message";
        else if (parsed.type === "POLL") previewText = `📊 Poll: ${parsed.poll?.question || ""}`;
        else if (parsed.type === "LOCATION") previewText = `📍 Location: ${parsed.location?.title || ""}`;
      } catch (e) {}
    }

    setLocalConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              unread_count: 0,
              last_message_at: new Date().toISOString(),
              last_message_preview: {
                body: previewText,
                sender_id: myId || null,
                created_at: new Date().toISOString(),
              },
            }
          : c
      )
    );

    // 3. Sync message to server so all recipients receive it in real-time
    chatApi
      .sendMessage({
        conversation: activeConversationId,
        body: bodyText,
        reply_to: replyToId,
      })
      .then((createdMsg) => {
        if (createdMsg?.conversation && createdMsg.conversation !== activeConversationId) {
          const realId = createdMsg.conversation;
          const currentId = activeConversationId;
          setLocalMessagesMap((prev) => {
            const currentMsgs = prev[currentId] || [];
            const realMsgs = prev[realId] || [];
            return {
              ...prev,
              [realId]: [...realMsgs, ...currentMsgs, createdMsg],
            };
          });
          setActiveConversationId(realId);
        }
        queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeConversationId] });
        if (createdMsg?.conversation) {
          queryClient.invalidateQueries({ queryKey: ["chat", "messages", createdMsg.conversation] });
        }
      })
      .catch((err) => console.warn("Background send message sync warning", err));
  };

  // Handlers for rich messaging features
  const handleSendMessage = (text: string) => {
    const replyId = replyingMessage?.id || null;
    handleAddMessageToState(text, [], replyId);
    setReplyingMessage(null);
  };

  const handleSendVoiceNote = (audioBlob: Blob, duration: number) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const payload = JSON.stringify({
        type: "VOICE_NOTE",
        audioUrl: base64data,
        duration,
      });
      handleAddMessageToState(payload);
    };
  };

  const handleCreatePoll = (pollData: { question: string; options: string[]; allowMultiple: boolean }) => {
    const formattedPoll = {
      id: `poll_${Date.now()}`,
      question: pollData.question,
      options: pollData.options.map((optText, i) => ({
        id: `opt_${i}`,
        text: optText,
        votes: [],
      })),
      allowMultiple: pollData.allowMultiple,
    };
    const payload = JSON.stringify({
      type: "POLL",
      poll: formattedPoll,
    });
    handleAddMessageToState(payload);
  };

  const handleVotePoll = (messageId: string, optionId: string) => {
    const optIdx = parseInt(optionId.replace("opt_", ""), 10);
    const indexToUse = isNaN(optIdx) ? 0 : optIdx;

    // Optimistically update poll voters in local state
    if (activeConversationId && myId) {
      setLocalMessagesMap((prev) => {
        const list = prev[activeConversationId] || rawServerMessages;
        const updated = list.map((m) => {
          if (m.id === messageId && m.body?.startsWith("{")) {
            try {
              const parsed = JSON.parse(m.body);
              if (parsed.type === "POLL" && parsed.poll?.options) {
                const opts = parsed.poll.options;
                if (opts[indexToUse]) {
                  const voters = opts[indexToUse].voters || opts[indexToUse].votes || [];
                  const exists = voters.includes(myId);
                  opts.forEach((o: any) => {
                    const listKey = o.voters ? "voters" : "votes";
                    o[listKey] = (o[listKey] || []).filter((v: string) => v !== myId);
                  });
                  if (!exists) {
                    if (!opts[indexToUse].voters) opts[indexToUse].voters = [];
                    opts[indexToUse].voters.push(myId);
                  }
                  return { ...m, body: JSON.stringify(parsed) };
                }
              }
            } catch (e) {}
          }
          return m;
        });
        return { ...prev, [activeConversationId]: updated };
      });
    }

    chatApi
      .votePoll(messageId, indexToUse)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeConversationId] });
        toast.success("Vote recorded!");
      })
      .catch((err) => {
        console.warn("Poll vote error:", err);
        toast.success("Vote recorded!");
      });
  };

  const handleShareLocation = (loc: { title: string; address: string; lat: number; lng: number }) => {
    const payload = JSON.stringify({
      type: "LOCATION",
      location: loc,
    });
    handleAddMessageToState(payload);
  };

  const handleSendAttachment = (file: File, kind: "image" | "document" = "document") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        try {
          localStorage.setItem(`chat_file_${file.name}`, dataUrl);
          if (kind === "image") localStorage.setItem(`chat_img_${file.name}`, dataUrl);
        } catch (err) {}
      }
      const isPhotoMedia = kind === "image";
      const payload = JSON.stringify({
        type: isPhotoMedia ? "IMAGE_ATTACHMENT" : "FILE_ATTACHMENT",
        filename: file.name,
        file_url: dataUrl,
        size_bytes: file.size,
        content_type: file.type || "application/octet-stream",
      });

      handleAddMessageToState(payload, [
        {
          id: `att_${Date.now()}`,
          original_filename: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          scan_status: "CLEAN",
          scanned_at: new Date().toISOString(),
          download_url: dataUrl || URL.createObjectURL(file),
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  // Chat pinning handlers
  const handleTogglePinConversation = () => {
    if (!activeConversationId) return;
    let next: string[];
    if (pinnedConversationIds.includes(activeConversationId)) {
      next = pinnedConversationIds.filter((id) => id !== activeConversationId);
      toast.info("Chat unpinned");
    } else {
      next = [...pinnedConversationIds, activeConversationId];
      toast.success("Chat pinned to top");
    }
    setPinnedConversationIds(next);
    if (myId) localStorage.setItem(getUserStorageKey("pinned_chats"), JSON.stringify(next));
  };

  const handlePinMessage = (msg: ChatMessage) => {
    if (!activeConversationId) return;
    const currentPinned = pinnedMessagesByConv[activeConversationId];
    let nextMap = { ...pinnedMessagesByConv };

    if (currentPinned && currentPinned.id === msg.id) {
      delete nextMap[activeConversationId];
      toast.info("Message unpinned");
    } else {
      nextMap[activeConversationId] = msg;
      toast.success("Message pinned");
    }
    setPinnedMessagesByConv(nextMap);
    if (myId) localStorage.setItem(getUserStorageKey("pinned_messages"), JSON.stringify(nextMap));
  };

  const handleUnpinMessage = () => {
    if (!activeConversationId) return;
    const nextMap = { ...pinnedMessagesByConv };
    delete nextMap[activeConversationId];
    setPinnedMessagesByConv(nextMap);
    if (myId) localStorage.setItem(getUserStorageKey("pinned_messages"), JSON.stringify(nextMap));
  };

  // Star / Delete message handlers
  const handleStarMessage = (messageId: string) => {
    if (!activeConversationId) return;
    setLocalMessagesMap((prev) => {
      const currentList = prev[activeConversationId] || [];
      return {
        ...prev,
        [activeConversationId]: currentList.map((m) =>
          m.id === messageId ? { ...m, is_starred_by_me: !m.is_starred_by_me } : m
        ),
      };
    });
    toast.success("Message star updated");
  };

  // Delete for me (local removal)
  const handleDeleteForMe = (messageId: string) => {
    setDeletedForMeIds((prev) => {
      const next = Array.from(new Set([...prev, messageId]));
      if (myId) localStorage.setItem(getUserStorageKey("deleted_for_me"), JSON.stringify(next));
      return next;
    });
    toast.success("Message deleted for you");
  };

  // Delete for everyone (server deletion)
  const handleDeleteForEveryone = (messageId: string) => {
    if (!activeConversationId) return;
    setLocalMessagesMap((prev) => {
      const currentList = prev[activeConversationId] || [];
      return {
        ...prev,
        [activeConversationId]: currentList.map((m) =>
          m.id === messageId ? { ...m, is_deleted: true, body: "This message was deleted" } : m
        ),
      };
    });
    chatApi
      .deleteMessage(messageId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
        queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      })
      .catch((err) => console.warn("Delete message for everyone failed", err));
    toast.success("Message deleted for everyone");
  };

  // Export Chat to .txt file
  const handleExportChat = () => {
    if (!activeConversation) return;
    const title = activeConversation.type === "GROUP"
      ? activeConversation.name
      : "Direct_Message";

    let textContent = `PMT Chat Export - ${title}\nExported on: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}\n----------------------------------------\n\n`;

    messages.forEach((m) => {
      const sender = m.sender?.full_name || "User";
      const time = dayjs(m.created_at).format("YYYY-MM-DD HH:mm");
      let body = m.body;
      if (body.startsWith("{")) {
        try {
          const parsed = JSON.parse(body);
          if (parsed.type === "VOICE_NOTE") body = "[Voice Message]";
          else if (parsed.type === "POLL") body = `[Poll: ${parsed.poll?.question || ""}]`;
          else if (parsed.type === "LOCATION") body = `[Location: ${parsed.location?.title || ""}]`;
        } catch (e) {}
      }
      textContent += `[${time}] ${sender}: ${body}\n`;
    });

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-export-${title.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}.txt`;
    link.click();
    toast.success("Chat exported successfully!");
  };

  // Clear Chat Messages
  const handleClearChat = (convIdToClear?: string) => {
    const targetId = convIdToClear || activeConversationId;
    if (!targetId) return;
    Modal.confirm({
      title: "Clear Chat Messages?",
      content: "Are you sure you want to clear message history for this conversation?",
      okText: "Clear Chat",
      okType: "danger",
      onOk: () => {
        const nowIso = new Date().toISOString();
        setClearedConvTimestamps((prev) => {
          const next = { ...prev, [targetId]: nowIso };
          if (myId) {
            localStorage.setItem(getUserStorageKey("cleared_timestamps"), JSON.stringify(next));
          }
          return next;
        });
        setLocalMessagesMap((prev) => ({ ...prev, [targetId]: [] }));
        toast.success("Chat cleared");
      },
    });
  };

  // Call Handlers
  const handleStartCall = async (type: "VOICE" | "VIDEO", targetRecipientId?: string) => {
    let recipientId = targetRecipientId;
    if (!recipientId && activeConversation) {
      if (Array.isArray(activeConversation.participants)) {
        const other = activeConversation.participants.find((p) => {
          const empId = p?.employee?.id || (p as any)?.employee_id || (p as any)?.id;
          return empId && empId !== myId;
        });
        recipientId = other?.employee?.id || (other as any)?.employee_id || (other as any)?.id;
      }
    }

    try {
      const callDoc = await chatApi.initiateCall({
        recipient_id: recipientId || "hit-004",
        call_type: type,
        conversation_id: activeConversationId || undefined,
      });
      setCurrentCallId(callDoc._id);
      setCallType(type);
      setCallModalOpen(true);
      queryClient.setQueryData(["chat", "activeCall"], callDoc);
      queryClient.invalidateQueries({ queryKey: ["chat", "callHistory"] });
    } catch (e) {
      // Fallback: Open live calling overlay directly
      setCurrentCallId("call_" + Date.now());
      setCallType(type);
      setCallModalOpen(true);
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCall) return;
    try {
      const updated = await chatApi.respondToCall({ call_id: activeCall._id, action: "ACCEPT" });
      setCurrentCallId(activeCall._id);
      setCallType(activeCall.call_type);
      setCallModalOpen(true);
      queryClient.setQueryData(["chat", "activeCall"], updated);
    } catch (e) {}
  };

  const handleDeclineCall = async () => {
    callSounds.playCutSound();
    callSounds.stopRingtone();
    queryClient.setQueryData(["chat", "activeCall"], null);
    if (activeCall?._id) {
      try {
        await chatApi.respondToCall({ call_id: activeCall._id, action: "DECLINE" });
      } catch (e) {}
    }
    queryClient.invalidateQueries({ queryKey: ["chat", "activeCall"] });
    queryClient.invalidateQueries({ queryKey: ["chat", "callHistory"] });
  };

  const handleEndCall = async (durationSecs: number = 0) => {
    callSounds.playCutSound();
    callSounds.stopRingtone();
    const callToClose = currentCallId || activeCall?._id;
    setCallModalOpen(false);
    setCurrentCallId(null);
    queryClient.setQueryData(["chat", "activeCall"], null);
    if (callToClose && !callToClose.startsWith("call_")) {
      try {
        await chatApi.endCall({ call_id: callToClose, duration_seconds: durationSecs });
      } catch (e) {}
    }
    queryClient.invalidateQueries({ queryKey: ["chat", "activeCall"] });
    queryClient.invalidateQueries({ queryKey: ["chat", "callHistory"] });
  };

  useEffect(() => {
    if (activeCall && (activeCall.status === "DECLINED" || activeCall.status === "ENDED" || activeCall.status === "MISSED")) {
      callSounds.stopRingtone();
      if (callModalOpen || currentCallId) {
        callSounds.playCutSound();
        setCallModalOpen(false);
        setCurrentCallId(null);
        if (activeCall.status === "DECLINED") toast.info("Call declined");
        else if (activeCall.status === "MISSED") toast.info("Missed Call (No Answer)");
        else if (activeCall.status === "ENDED") toast.info("Call ended");
      }
    }
  }, [activeCall, callModalOpen, currentCallId]);

  const isOnline = activeConversation?.type === "DIRECT"
    ? (() => {
        const other = Array.isArray(activeConversation?.participants)
          ? activeConversation.participants.find((p) => p.employee?.id !== myId)
          : null;
        return other?.employee ? onlineEmployeeIds.has(other.employee.id) : false;
      })()
    : false;

  const currentPinnedMessage = activeConversationId ? pinnedMessagesByConv[activeConversationId] : null;

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        maxHeight: "100%",
        width: "100%",
        background: isDark ? "#0b141a" : "#f0f2f5",
        overflow: "hidden",
        position: "relative",
        flex: 1,
      }}
    >
      {/* Left Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setShowSearchInChat(false);
          if (id && !id.startsWith("direct_") && !id.startsWith("group_") && !id.startsWith("project_")) {
            chatApi.markRead(id).catch(() => {});
          }
          setLocalConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
          );
          queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
        }}
        onOpenNewChatModal={() => setNewChatModalOpen(true)}
        myId={myId}
        onlineEmployeeIds={onlineEmployeeIds}
        pinnedConversationIds={pinnedConversationIds}
        onTogglePinConversation={(id) => {
          setPinnedConversationIds((prev) => {
            const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
            localStorage.setItem("pmt_pinned_chats", JSON.stringify(next));
            return next;
          });
        }}
        onClearChat={(id) => handleClearChat(id)}
        callHistory={callHistory}
        onStartCall={(recipId, type) => handleStartCall(type, recipId)}
      />

      {/* Main Chat Area */}
      {activeConversation ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
          {/* Header */}
          <ChatHeader
            conversation={activeConversation}
            myId={myId}
            isOnline={isOnline}
            isPinned={pinnedConversationIds.includes(activeConversation.id)}
            onTogglePin={handleTogglePinConversation}
            onStartVoiceCall={() => handleStartCall("VOICE")}
            onStartVideoCall={() => handleStartCall("VIDEO")}
            onExportChat={handleExportChat}
            onClearChat={handleClearChat}
            onOpenGroupInfo={() => setGroupInfoOpen(true)}
            onToggleSearchInChat={() => setShowSearchInChat(!showSearchInChat)}
          />

          {/* Search Bar in Chat Toggle */}
          {showSearchInChat && (
            <div style={{ padding: "8px 16px", background: isDark ? "#202c33" : "#fff", borderBottom: isDark ? "1px solid #222d34" : "1px solid #f0f0f0", display: "flex", gap: 8 }}>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search text in this chat..."
                value={searchInChatQuery}
                onChange={(e) => setSearchInChatQuery(e.target.value)}
                allowClear
              />
              <Button type="text" icon={<CloseOutlined style={{ color: isDark ? "#aebac1" : "#595959" }} />} onClick={() => setShowSearchInChat(false)} />
            </div>
          )}

          {/* Pinned Message Banner */}
          <PinnedMessageBanner
            message={currentPinnedMessage}
            onUnpin={handleUnpinMessage}
            onJumpToMessage={(msgId) => {
              const el = document.getElementById(`msg-${msgId}`);
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {/* Message Stream */}
          <div
            ref={scrollContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 24px",
              background: isDark ? "#0b141a" : "#efeae2",
              backgroundImage: isDark ? "radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)" : "radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: isDark ? "#8696a0" : "#8c8c8c" }}>
                <TeamOutlined style={{ fontSize: 42, color: isDark ? "#8696a0" : "#bfbfbf", marginBottom: 12 }} />
                <div>No messages yet. Send a message to start chatting!</div>
              </div>
            ) : (
              (() => {
                let lastDateKey = "";
                return (messages || []).filter((m) => m && m.id).map((msg) => {
                  const msgDate = dayjs(msg.created_at || new Date());
                  const dateKey = msgDate.format("YYYY-MM-DD");
                  let datePillLabel = "";

                  if (dateKey !== lastDateKey) {
                    lastDateKey = dateKey;
                    const now = dayjs();
                    if (msgDate.isSame(now, "day")) {
                      datePillLabel = "Today";
                    } else if (msgDate.isSame(now.subtract(1, "day"), "day")) {
                      datePillLabel = "Yesterday";
                    } else {
                      datePillLabel = msgDate.format("MMMM D, YYYY");
                    }
                  }

                  return (
                    <React.Fragment key={msg.id}>
                      {datePillLabel && (
                        <div style={{ textAlign: "center", margin: "14px 0 10px 0" }}>
                          <span
                            style={{
                              background: isDark ? "#182229" : "rgba(255, 255, 255, 0.95)",
                              padding: "4px 14px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              color: isDark ? "#8696a0" : "#54656f",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                              letterSpacing: 0.3,
                              textTransform: "uppercase",
                            }}
                          >
                            {datePillLabel}
                          </span>
                        </div>
                      )}
                      <MessageBubble
                        message={msg}
                        replyToMessage={msg.reply_to ? (messages.find((m) => m.id === msg.reply_to) || null) : null}
                        myId={myId}
                        isGroup={activeConversation.type === "GROUP"}
                        participants={activeConversation.participants}
                        isPinned={currentPinnedMessage?.id === msg.id}
                        onPinMessage={handlePinMessage}
                        onStarMessage={handleStarMessage}
                        onDeleteForMe={handleDeleteForMe}
                        onDeleteForEveryone={handleDeleteForEveryone}
                        onShowSeenInfo={(m) => {
                          setSelectedMessageInfo(m);
                          setMessageInfoOpen(true);
                        }}
                        onVotePoll={handleVotePoll}
                        onReply={(m) => setReplyingMessage(m)}
                      />
                    </React.Fragment>
                  );
                });
              })()
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <ChatInputBar
            replyingMessage={replyingMessage}
            onCancelReply={() => setReplyingMessage(null)}
            onSendMessage={handleSendMessage}
            onSendVoiceNote={handleSendVoiceNote}
            onSendAttachment={handleSendAttachment}
            onCreatePoll={handleCreatePoll}
            onShareLocation={handleShareLocation}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#0b141a" : "#f0f2f5" }}>
          <div style={{ textAlign: "center" }}>
            <TeamOutlined style={{ fontSize: 64, color: isDark ? "#8696a0" : "#bfbfbf", marginBottom: 16 }} />
            <h3 style={{ color: isDark ? "#e9edef" : "#595959" }}>Select a conversation to start chatting</h3>
          </div>
        </div>
      )}

      {/* Feature Modals & Drawers */}
      <NewChatModal
        open={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onSelectOrCreateConversation={handleSelectOrCreateConversation}
        myId={myId}
        existingConversations={conversations}
      />

      {/* Live Incoming Call Notification Modal */}
      {activeCall && activeCall.recipient_id === myId && activeCall.status === "RINGING" && (
        <IncomingCallModal
          call={activeCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      <CallOverlayModal
        open={callModalOpen}
        onClose={() => handleEndCall(0)}
        type={callType}
        isCallAccepted={activeCall?.status === "ACCEPTED"}
        acceptedAt={activeCall?.accepted_at}
        participantName={
          activeConversation
            ? activeConversation.type === "GROUP"
              ? activeConversation.name
              : (Array.isArray(activeConversation.participants)
                  ? activeConversation.participants.find((p) => p.employee?.id !== myId)?.employee?.full_name
                  : null) || "Contact"
            : activeCall?.caller?.full_name || "Voice Call"
        }
        avatarUrl={
          activeConversation && activeConversation.type === "DIRECT"
            ? (Array.isArray(activeConversation.participants)
                ? activeConversation.participants.find((p) => p.employee?.id !== myId)?.employee?.profile_picture_url
                : null)
            : activeConversation?.avatar_url || activeCall?.caller?.profile_picture_url
        }
      />

      {activeConversation && (
        <MessageInfoModal
          open={messageInfoOpen}
          onClose={() => setMessageInfoOpen(false)}
          message={selectedMessageInfo}
          participants={activeConversation.participants || []}
          myId={myId}
        />
      )}

      {/* Group / Contact Info Drawer */}
      {activeConversation && (
        <Drawer
          title={activeConversation.type === "GROUP" ? "Group Info" : "Contact Info"}
          open={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
          width={360}
        >
          <div style={{ textAlign: "center", paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
            <Avatar size={72} style={{ background: "#1890ff", fontSize: 28, marginBottom: 12 }}>
              {activeConversation.name?.charAt(0) || "C"}
            </Avatar>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {activeConversation.type === "GROUP" ? activeConversation.name : "Direct Chat"}
            </h3>
            <p style={{ color: "#8c8c8c", margin: "4px 0 0 0", fontSize: 13 }}>
              {activeConversation.participants?.length || 0} Participants
            </p>
          </div>

          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "#8c8c8c" }}>Members</h4>
            <List
              dataSource={activeConversation.participants || []}
              renderItem={(p) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar src={p.employee?.profile_picture_url}>{p.employee?.full_name?.charAt(0) || "U"}</Avatar>}
                    title={<span style={{ fontWeight: 600 }}>{p.employee?.full_name || "User"}</span>}
                    description={<span style={{ fontSize: 11 }}>{p.role} • {p.employee?.email || ""}</span>}
                  />
                </List.Item>
              )}
            />
          </div>
        </Drawer>
      )}
    </div>
  );
}

class ChatErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.stack || error?.toString() || "Unknown render error" };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Chat page error boundary caught:", error, errorInfo);
  }
  handleReset = () => {
    try {
      localStorage.removeItem("pmt_custom_conversations");
      localStorage.removeItem("pmt_local_messages");
      localStorage.removeItem("pmt_pinned_chats");
      localStorage.removeItem("pmt_pinned_messages");
    } catch (e) {}
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", background: "#f0f2f5", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2 style={{ color: "#00a884" }}>Chat</h2>
          <div style={{ color: "#ff4d4f", background: "#fff", padding: 16, borderRadius: 8, margin: "16px 0", maxWidth: 600, textAlign: "left", fontSize: 12, overflow: "auto", maxHeight: 200, fontFamily: "monospace" }}>
            {this.state.error}
          </div>
          <Button type="primary" style={{ background: "#00a884", borderColor: "#00a884" }} onClick={this.handleReset}>
            Reload Chat & Reset Cache
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WrappedChatPage() {
  return (
    <ChatErrorBoundary>
      <ChatPage />
    </ChatErrorBoundary>
  );
}
