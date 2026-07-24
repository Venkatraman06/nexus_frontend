import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Avatar, Badge, Button, Drawer, Empty, Input, List, Modal, Popconfirm, Segmented, Select,
  Spin, Tag, Tooltip, Typography, message as toast,
} from "antd";
import {
  CameraOutlined, CheckOutlined, CloseOutlined, DeleteOutlined,
  EditOutlined, LogoutOutlined, PaperClipOutlined,
  PlusOutlined, SendOutlined, StarFilled, StarOutlined, TeamOutlined, UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { useChatSocket } from "@/hooks/useChatSocket";
import { employeeApi, type SimpleDropdownEmployee } from "@/services/employees";
import {
  chatApi, MAX_ATTACHMENT_SIZE, type ChatMessage, type ConversationListItem,
} from "@/services/chat";
import RichTextEditor from "@/components/common/RichTextEditor";
import { PostContent, htmlToPlainText, extractMentionIds } from "@/components/common/RichTextContent";
import AssigneeAvatar from "@/components/common/AssigneeAvatar";
import AttachmentCard from "@/components/common/AttachmentCard";
import { avatarPastel } from "@/utils/avatarColors";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

type FilterTab = "all" | "mentions" | "important" | "files" | "starred";

function conversationTitle(conversation: ConversationListItem, myId: string | undefined): string {
  if (conversation.type === "GROUP") return conversation.name || "Group chat";
  const other = conversation.participants.find((p) => p.employee.id !== myId);
  return other?.employee.full_name ?? "Direct message";
}

/** An attachment-only message has no body text — don't render an empty
 * colored bubble for it (looked like a stray loading bar). Deleted messages
 * still need the bubble, since that's where the "message deleted" text goes. */
export function shouldShowMessageBubble(msg: Pick<ChatMessage, "body" | "is_deleted">): boolean {
  return Boolean(msg.body) || msg.is_deleted;
}

function ConversationAvatar({ conversation, myId, online }: {
  conversation: ConversationListItem; myId: string | undefined; online: boolean;
}) {
  const other = conversation.type === "DIRECT"
    ? conversation.participants.find((p) => p.employee.id !== myId)
    : undefined;
  const avatarNode = conversation.type === "GROUP"
    ? <GroupAvatar conversation={conversation} />
    : <AssigneeAvatar name={other?.employee.full_name ?? "?"} src={other?.employee.profile_picture_url} size={32} />;
  if (conversation.type === "DIRECT") {
    return <Badge dot status={online ? "success" : "default"} offset={[-4, 32]}>{avatarNode}</Badge>;
  }
  return avatarNode;
}

/** Group photo when the admin has set one, else a soft-colored team icon
 * (same pastel treatment as person avatars, keyed by group name so each
 * group gets a consistent, distinct color rather than flat gray). */
function GroupAvatar({ conversation, size = 32 }: { conversation: ConversationListItem; size?: number }) {
  if (conversation.avatar_url) {
    return <Avatar size={size} src={conversation.avatar_url} />;
  }
  const av = avatarPastel(conversation.name || conversation.id);
  return (
    <Avatar
      size={size}
      icon={<TeamOutlined />}
      style={{ background: av.bg, color: av.text, border: `1px solid ${av.border}` }}
    />
  );
}

export default function ChatPage() {
  const myId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const { startTyping, stopTyping } = useChatSocket();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const typingByConversation = useChatStore((s) => s.typingByConversation);
  const onlineEmployeeIds = useChatStore((s) => s.onlineEmployeeIds);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [draft, setDraft] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatIsGroup, setNewChatIsGroup] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [newChatParticipants, setNewChatParticipants] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => chatApi.listConversations(),
    refetchInterval: 15_000,
  });
  const conversations: ConversationListItem[] = Array.isArray(conversationsQuery.data)
    ? conversationsQuery.data
    : conversationsQuery.data?.results ?? [];

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, setActiveConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", activeConversationId],
    queryFn: () => chatApi.listMessages(activeConversationId as string),
    enabled: filterTab === "all" && !!activeConversationId,
  });

  const mentionsQuery = useQuery({
    queryKey: ["chat", "mentions"],
    queryFn: () => chatApi.myMentions(),
    enabled: filterTab === "mentions",
  });

  const starredQuery = useQuery({
    queryKey: ["chat", "starred"],
    queryFn: () => chatApi.starredMessages(),
    enabled: filterTab === "starred",
  });

  const filteredMessages: ChatMessage[] = useMemo(() => {
    if (filterTab === "mentions") return mentionsQuery.data?.results ?? [];
    if (filterTab === "starred") return starredQuery.data?.results ?? [];
    if (filterTab === "important") return (messagesQuery.data?.results ?? []).filter((m) => m.is_important);
    return messagesQuery.data?.results ?? [];
  }, [filterTab, messagesQuery.data, mentionsQuery.data, starredQuery.data]);

  const fileAttachments = useMemo(
    () => (messagesQuery.data?.results ?? []).flatMap((m) => m.attachments.map((a) => ({ ...a, messageId: m.id }))),
    [messagesQuery.data]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages.length]);

  useEffect(() => {
    if (activeConversationId) {
      chatApi.markRead(activeConversationId).then(() =>
        queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] })
      );
    }
  }, [activeConversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId) return;
      let attachments;
      if (pendingFile) {
        const { upload_url, object_key } = await chatApi.presignAttachment(
          activeConversationId, pendingFile.name, pendingFile.type, pendingFile.size
        );
        await chatApi.uploadToPresignedUrl(upload_url, pendingFile);
        attachments = [{
          object_key, original_filename: pendingFile.name,
          content_type: pendingFile.type, size_bytes: pendingFile.size,
        }];
      }
      return chatApi.sendMessage({
        conversation: activeConversationId,
        body: draft,
        attachments,
        mention_employee_ids: extractMentionIds(draft),
      });
    },
    onSuccess: () => {
      setDraft("");
      setPendingFile(null);
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: () => toast.error("Failed to send message"),
  });

  const starMutation = useMutation({
    mutationFn: (id: string) => chatApi.starMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["chat", "starred"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatApi.deleteMessage(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", "messages", activeConversationId] }),
  });

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => chatApi.favoriteConversation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] }),
  });

  const employeesQuery = useQuery({
    queryKey: ["employees", "simple-dropdown"],
    queryFn: () => employeeApi.simpleDropdown(),
    enabled: newChatOpen || groupInfoOpen,
  });

  const addMembersMutation = useMutation({
    mutationFn: () => chatApi.addMembers(activeConversation!.id, addMemberIds),
    onSuccess: () => {
      setAddMemberIds([]);
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast.success("Member(s) added");
    },
    onError: () => toast.error("Could not add member(s)"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (employeeId: string) => chatApi.removeMember(activeConversation!.id, employeeId),
    onSuccess: (_data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      if (employeeId === myId) {
        setGroupInfoOpen(false);
        setActiveConversationId(null);
      }
      toast.success("Removed from group");
    },
    onError: () => toast.error("Could not remove member"),
  });

  const renameGroupMutation = useMutation({
    mutationFn: (name: string) => chatApi.updateConversation(activeConversation!.id, { name }),
    onSuccess: () => {
      setEditingGroupName(false);
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
    onError: () => toast.error("Could not rename group"),
  });

  const groupAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const { upload_url, object_key } = await chatApi.presignAttachment(
        activeConversation!.id, file.name, file.type, file.size
      );
      await chatApi.uploadToPresignedUrl(upload_url, file);
      return chatApi.updateConversation(activeConversation!.id, { avatar: object_key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      toast.success("Group photo updated");
    },
    onError: () => toast.error("Could not update group photo"),
  });

  const createConversationMutation = useMutation({
    mutationFn: () =>
      chatApi.createConversation({
        type: newChatIsGroup ? "GROUP" : "DIRECT",
        name: newChatIsGroup ? newChatName : undefined,
        participant_ids: newChatParticipants,
      }),
    onSuccess: (conversation) => {
      setNewChatOpen(false);
      setNewChatParticipants([]);
      setNewChatName("");
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
      setActiveConversationId(conversation.id);
    },
    onError: () => toast.error("Could not start conversation"),
  });

  let typingTimer: ReturnType<typeof setTimeout> | null = null;
  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!activeConversationId) return;
    startTyping(activeConversationId);
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => stopTyping(activeConversationId), 2000);
  };
  // draft holds rich-text HTML now — a blank editor still reports "" (see
  // RichTextEditor's onUpdate), but check the plain-text content too so
  // whitespace-only formatting doesn't count as a real message.
  const isDraftEmpty = !htmlToPlainText(draft).trim();

  // Who "@name" can resolve to in the open conversation — the other
  // participants, so you can't mention someone who can't see the message.
  const mentionableParticipants = (activeConversation?.participants ?? [])
    .filter((p) => p.employee.id !== myId)
    .map((p) => ({
      id: p.employee.id,
      label: p.employee.full_name,
      avatarSrc: p.employee.profile_picture_url,
    }));

  const typingEmployeeIds = activeConversationId
    ? Array.from(typingByConversation[activeConversationId] ?? [])
    : [];
  const typingNames = typingEmployeeIds
    .map((id) => activeConversation?.participants.find((p) => p.employee.id === id)?.employee.full_name)
    .filter(Boolean);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 112px)", gap: 16 }}>
      <div style={{ width: 320, display: "flex", flexDirection: "column", borderRight: "1px solid var(--pmt-border, #e5e7eb)" }}>
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={5} style={{ margin: 0 }}>Chat</Title>
          <Tooltip title="New conversation">
            <Button aria-label="New conversation" icon={<PlusOutlined />} size="small" onClick={() => setNewChatOpen(true)} />
          </Tooltip>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversationsQuery.isLoading ? (
            <Spin style={{ margin: 24 }} />
          ) : conversations.length === 0 ? (
            <Empty description="No conversations yet" style={{ marginTop: 40 }} />
          ) : (
            <List
              dataSource={conversations}
              renderItem={(conversation) => {
                const other = conversation.participants.find((p) => p.employee.id !== myId);
                const online = conversation.type === "DIRECT" && !!other && onlineEmployeeIds.has(other.employee.id);
                return (
                  <List.Item
                    onClick={() => setActiveConversationId(conversation.id)}
                    style={{
                      cursor: "pointer", padding: "10px 16px",
                      background: conversation.id === activeConversationId ? "rgba(22,119,255,0.08)" : undefined,
                    }}
                  >
                    <List.Item.Meta
                      avatar={<ConversationAvatar conversation={conversation} myId={myId} online={online} />}
                      title={
                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{conversationTitle(conversation, myId)}</span>
                          {conversation.is_favorite && <StarFilled style={{ color: "#f5a623", fontSize: 12 }} />}
                        </span>
                      }
                      description={
                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text type="secondary" ellipsis style={{ maxWidth: 180 }}>
                            {conversation.last_message_preview
                              ? htmlToPlainText(conversation.last_message_preview.body) || "(no text)"
                              : "No messages yet"}
                          </Text>
                          {conversation.unread_count > 0 && <Badge count={conversation.unread_count} size="small" />}
                        </span>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeConversation ? (
          <Empty description="Select a conversation" style={{ marginTop: 80 }} />
        ) : (
          <>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--pmt-border, #e5e7eb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>{conversationTitle(activeConversation, myId)}</Title>
                {typingNames.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>{typingNames.join(", ")} typing…</Text>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {activeConversation.type === "GROUP" && (
                  <Tooltip title="Group info">
                    <Button
                      aria-label="Group info"
                      icon={<TeamOutlined />}
                      size="small"
                      onClick={() => setGroupInfoOpen(true)}
                    />
                  </Tooltip>
                )}
                <Button
                  size="small"
                  icon={activeConversation.is_favorite ? <StarFilled /> : <StarOutlined />}
                  onClick={() => favoriteMutation.mutate(activeConversation.id)}
                />
              </div>
            </div>

            <div style={{ padding: "8px 16px" }}>
              <Segmented
                size="small"
                value={filterTab}
                onChange={(v) => setFilterTab(v as FilterTab)}
                options={[
                  { label: "All", value: "all" },
                  { label: "Mentions", value: "mentions" },
                  { label: "Important", value: "important" },
                  { label: "Files", value: "files" },
                  { label: "Starred", value: "starred" },
                ]}
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
              {filterTab === "files" ? (
                <List
                  dataSource={fileAttachments}
                  locale={{ emptyText: "No files shared yet" }}
                  renderItem={(file) => (
                    <List.Item style={{ border: "none", padding: "6px 0" }}>
                      <AttachmentCard attachment={file} />
                    </List.Item>
                  )}
                />
              ) : (
                <List
                  dataSource={filteredMessages}
                  locale={{ emptyText: "No messages" }}
                  renderItem={(msg) => {
                    const mine = msg.sender?.id === myId;
                    return (
                      <List.Item style={{ border: "none", padding: "6px 0", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                        <div style={{ display: "flex", gap: 8, maxWidth: "70%", flexDirection: mine ? "row-reverse" : "row" }}>
                          <AssigneeAvatar name={msg.sender?.full_name ?? "?"} src={msg.sender?.profile_picture_url} size={24} />
                          <div>
                            {shouldShowMessageBubble(msg) && (
                              <div style={{
                                background: mine ? "#1677ff" : "#f0f0f0",
                                color: mine ? "#fff" : undefined,
                                borderRadius: 12, padding: "8px 12px",
                                fontStyle: msg.is_deleted ? "italic" : undefined,
                              }}>
                                <PostContent
                                  content={msg.body}
                                  style={{ color: mine ? "#fff" : undefined, fontSize: 14 }}
                                />
                                {msg.is_important && <Tag color="gold" style={{ marginTop: 4 }}>Important</Tag>}
                              </div>
                            )}
                            {msg.attachments.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: shouldShowMessageBubble(msg) ? 6 : 0 }}>
                                {msg.attachments.map((a) => (
                                  <AttachmentCard key={a.id} attachment={a} mine={mine} />
                                ))}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: "#999", marginTop: 2, display: "flex", gap: 8 }}>
                              <span>{dayjs(msg.created_at).fromNow()}</span>
                              {msg.is_edited && <span>(edited)</span>}
                              {!msg.is_deleted && (
                                <>
                                  <StarOutlined
                                    style={{ cursor: "pointer", color: msg.is_starred_by_me ? "#f5a623" : undefined }}
                                    onClick={() => starMutation.mutate(msg.id)}
                                  />
                                  {mine && <DeleteOutlined style={{ cursor: "pointer" }} onClick={() => deleteMutation.mutate(msg.id)} />}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {filterTab === "all" && (
              <div style={{ padding: 16, borderTop: "1px solid var(--pmt-border, #e5e7eb)" }}>
                {pendingFile && (
                  <Tag closable onClose={() => setPendingFile(null)} style={{ marginBottom: 8 }}>
                    {pendingFile.name}
                  </Tag>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_ATTACHMENT_SIZE) {
                      toast.error("File exceeds the 10MB limit");
                      return;
                    }
                    setPendingFile(file);
                  }}
                />
                <RichTextEditor
                  value={draft}
                  onChange={handleDraftChange}
                  onEnterToSubmit={() => {
                    if (isDraftEmpty && !pendingFile) return;
                    sendMutation.mutate();
                  }}
                  placeholder="Type a message…"
                  mentionable={mentionableParticipants}
                  minHeight={28}
                  compact
                  showColors={false}
                  trailingActions={
                    <>
                      <Tooltip title="Attach file">
                        <Button
                          type="text" size="small" icon={<PaperClipOutlined />}
                          onClick={() => fileInputRef.current?.click()}
                          style={{ width: 28, height: 28, padding: 0 }}
                        />
                      </Tooltip>
                      <Button
                        type="primary" shape="circle" size="small"
                        icon={<SendOutlined />}
                        loading={sendMutation.isPending}
                        disabled={isDraftEmpty && !pendingFile}
                        onClick={() => sendMutation.mutate()}
                      />
                    </>
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        title="New conversation"
        open={newChatOpen}
        onCancel={() => setNewChatOpen(false)}
        onOk={() => createConversationMutation.mutate()}
        confirmLoading={createConversationMutation.isPending}
        okButtonProps={{ disabled: newChatParticipants.length === 0 || (newChatIsGroup && !newChatName.trim()) }}
      >
        <Segmented
          value={newChatIsGroup ? "group" : "direct"}
          onChange={(v) => setNewChatIsGroup(v === "group")}
          options={[{ label: "Direct message", value: "direct" }, { label: "Group", value: "group" }]}
          style={{ marginBottom: 12 }}
        />
        {newChatIsGroup && (
          <Input
            placeholder="Group name"
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            style={{ marginBottom: 12 }}
          />
        )}
        <Select
          mode={newChatIsGroup ? "multiple" : undefined}
          style={{ width: "100%" }}
          placeholder="Select participant(s)"
          loading={employeesQuery.isLoading}
          value={newChatIsGroup ? newChatParticipants : newChatParticipants[0]}
          onChange={(v) => setNewChatParticipants(newChatIsGroup ? (v as string[]) : [v as string])}
          options={(employeesQuery.data ?? [])
            .filter((e: SimpleDropdownEmployee) => e.id !== myId)
            .map((e: SimpleDropdownEmployee) => ({ label: e.full_name, value: e.id }))}
          showSearch
          optionFilterProp="label"
        />
      </Modal>

      {activeConversation && activeConversation.type === "GROUP" && (
        <Drawer
          title="Group info"
          open={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
          width={360}
        >
          {(() => {
            const myParticipant = activeConversation.participants.find((p) => p.employee.id === myId);
            const isAdmin = myParticipant?.role === "ADMIN";
            const existingIds = new Set(activeConversation.participants.map((p) => p.employee.id));
            return (
              <>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ position: "relative" }}>
                    <GroupAvatar conversation={activeConversation} size={72} />
                    {isAdmin && (
                      <>
                        <input
                          ref={groupAvatarInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > MAX_ATTACHMENT_SIZE) {
                              toast.error("Image exceeds the 10MB limit");
                              return;
                            }
                            groupAvatarMutation.mutate(file);
                          }}
                        />
                        <Tooltip title="Change group photo (optional)">
                          <Button
                            shape="circle"
                            size="small"
                            icon={<CameraOutlined />}
                            loading={groupAvatarMutation.isPending}
                            onClick={() => groupAvatarInputRef.current?.click()}
                            style={{ position: "absolute", bottom: -2, right: -2 }}
                          />
                        </Tooltip>
                      </>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                    {editingGroupName ? (
                      <>
                        <Input
                          size="small"
                          autoFocus
                          value={groupNameDraft}
                          onChange={(e) => setGroupNameDraft(e.target.value)}
                          onPressEnter={() => groupNameDraft.trim() && renameGroupMutation.mutate(groupNameDraft.trim())}
                          style={{ width: 180, textAlign: "center" }}
                        />
                        <Button
                          size="small" type="text" icon={<CheckOutlined />}
                          loading={renameGroupMutation.isPending}
                          disabled={!groupNameDraft.trim()}
                          onClick={() => renameGroupMutation.mutate(groupNameDraft.trim())}
                        />
                        <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setEditingGroupName(false)} />
                      </>
                    ) : (
                      <>
                        <Typography.Title level={5} style={{ margin: 0 }}>{activeConversation.name}</Typography.Title>
                        {isAdmin && (
                          <Button
                            size="small" type="text" icon={<EditOutlined />}
                            aria-label="Rename group"
                            onClick={() => { setGroupNameDraft(activeConversation.name); setEditingGroupName(true); }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                <Typography.Title level={5}>
                  Members ({activeConversation.participants.length})
                </Typography.Title>
                <List
                  dataSource={activeConversation.participants}
                  renderItem={(p) => (
                    <List.Item
                      actions={
                        p.employee.id === myId
                          ? [
                              <Popconfirm
                                key="leave"
                                title="Leave this group?"
                                onConfirm={() => removeMemberMutation.mutate(p.employee.id)}
                              >
                                <Button size="small" danger icon={<LogoutOutlined />}>Leave</Button>
                              </Popconfirm>,
                            ]
                          : isAdmin
                          ? [
                              <Popconfirm
                                key="remove"
                                title={`Remove ${p.employee.full_name}?`}
                                onConfirm={() => removeMemberMutation.mutate(p.employee.id)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>,
                            ]
                          : []
                      }
                    >
                      <List.Item.Meta
                        avatar={<AssigneeAvatar name={p.employee.full_name} src={p.employee.profile_picture_url} size={32} />}
                        title={p.employee.full_name}
                        description={p.role === "ADMIN" ? <Tag color="blue">Admin</Tag> : "Member"}
                      />
                    </List.Item>
                  )}
                />

                {isAdmin && (
                  <>
                    <Typography.Title level={5} style={{ marginTop: 24 }}>Add members</Typography.Title>
                    <Select
                      mode="multiple"
                      style={{ width: "100%", marginBottom: 8 }}
                      placeholder="Select employee(s) to add"
                      loading={employeesQuery.isLoading}
                      value={addMemberIds}
                      onChange={(v) => setAddMemberIds(v as string[])}
                      options={(employeesQuery.data ?? [])
                        .filter((e: SimpleDropdownEmployee) => !existingIds.has(e.id))
                        .map((e: SimpleDropdownEmployee) => ({ label: e.full_name, value: e.id }))}
                      showSearch
                      optionFilterProp="label"
                    />
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      block
                      disabled={addMemberIds.length === 0}
                      loading={addMembersMutation.isPending}
                      onClick={() => addMembersMutation.mutate()}
                    >
                      Add to group
                    </Button>
                  </>
                )}
              </>
            );
          })()}
        </Drawer>
      )}
    </div>
  );
}
