import { get, post, patch, del } from "@/services/api";

export type ConversationType = "DIRECT" | "GROUP";
export type ParticipantRole = "MEMBER" | "ADMIN";
export type ScanStatus = "PENDING" | "CLEAN" | "INFECTED" | "ERROR";

export interface ChatEmployee {
  id: string;
  full_name: string;
  email: string;
  profile_picture_url: string | null;
}

export interface ConversationParticipant {
  id: string;
  employee: ChatEmployee;
  role: ParticipantRole;
  is_favorite: boolean;
  muted: boolean;
  last_read_at: string | null;
}

export interface ConversationListItem {
  id: string;
  type: ConversationType;
  name: string;
  /** Presigned URL for the group photo, or null if none set (DIRECT
   * conversations never have one — the frontend derives their identity from
   * the other participant instead). */
  avatar_url: string | null;
  is_archived: boolean;
  last_message_at: string | null;
  participants: ConversationParticipant[];
  unread_count: number;
  is_favorite: boolean;
  last_message_preview: { body: string; sender_id: string | null; created_at: string } | null;
}

export interface MessageAttachment {
  id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  scan_status: ScanStatus;
  scanned_at: string | null;
  download_url: string | null;
}

export interface ChatMessage {
  id: string;
  conversation: string;
  sender: ChatEmployee | null;
  body: string;
  reply_to: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_important: boolean;
  is_deleted: boolean;
  mentioned_employee_ids: string[];
  attachments: MessageAttachment[];
  is_starred_by_me: boolean;
  reaction_summary: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SearchResults {
  messages: ChatMessage[];
  files: MessageAttachment[];
}

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB, mirrors settings.CHAT_MAX_ATTACHMENT_SIZE

export const chatApi = {
  listConversations: () => get<PaginatedResponse<ConversationListItem> | ConversationListItem[]>("/chat/conversations/"),

  createConversation: (data: { type: ConversationType; name?: string; participant_ids: string[] }) =>
    post<ConversationListItem>("/chat/conversations/", data),

  /** Rename a group / set its photo (avatar = object_key from
   * presignAttachment, reused here — same presigned-upload flow as message
   * attachments) — admin-only, enforced server-side. */
  updateConversation: (id: string, data: { name?: string; avatar?: string }) =>
    patch<ConversationListItem>(`/chat/conversations/${id}/`, data),

  favoriteConversation: (id: string) =>
    post<{ is_favorite: boolean }>(`/chat/conversations/${id}/favorite/`),

  markRead: (id: string) =>
    post<{ last_read_at: string }>(`/chat/conversations/${id}/read/`),

  addMembers: (id: string, employeeIds: string[]) =>
    post<ConversationListItem>(`/chat/conversations/${id}/members/`, { employee_ids: employeeIds }),

  removeMember: (id: string, employeeId: string) =>
    del(`/chat/conversations/${id}/members/${employeeId}/`),

  listMessages: (conversationId: string, params?: Record<string, unknown>) =>
    get<PaginatedResponse<ChatMessage>>("/chat/messages/", { conversation: conversationId, ...params }),

  sendMessage: (data: {
    conversation: string;
    body: string;
    reply_to?: string | null;
    is_important?: boolean;
    mention_employee_ids?: string[];
    attachments?: Array<{ object_key: string; original_filename: string; content_type: string; size_bytes: number }>;
  }) => post<ChatMessage>("/chat/messages/", data),

  editMessage: (id: string, body: string) =>
    patch<ChatMessage>(`/chat/messages/${id}/`, { body }),

  deleteMessage: (id: string) => del(`/chat/messages/${id}/`),

  starMessage: (id: string) =>
    post<{ is_starred_by_me: boolean }>(`/chat/messages/${id}/star/`),

  markImportant: (id: string) =>
    post<{ is_important: boolean }>(`/chat/messages/${id}/important/`),

  myMentions: () => get<PaginatedResponse<ChatMessage>>("/chat/messages/mentions/"),

  starredMessages: () => get<PaginatedResponse<ChatMessage>>("/chat/messages/starred/"),

  search: (q: string, conversationId?: string) =>
    get<SearchResults>("/chat/search/", conversationId ? { q, conversation: conversationId } : { q }),

  presignAttachment: (conversationId: string, filename: string, contentType: string, sizeBytes: number) =>
    post<{ upload_url: string; object_key: string }>(
      `/chat/conversations/${conversationId}/attachments/presign/`,
      { filename, content_type: contentType, size_bytes: sizeBytes },
    ),

  uploadToPresignedUrl: (uploadUrl: string, file: File) =>
    fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } }),
};
