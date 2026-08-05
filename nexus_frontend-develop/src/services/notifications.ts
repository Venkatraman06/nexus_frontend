import { get, post } from "@/services/api";

export interface Notification {
  id: string;
  event_type: string;
  title: string;
  message: string;
  reference_type: string;
  reference_id: string;
  action_url: string;
  severity: "info" | "warning" | "urgent";
  is_read: boolean;
  read_at: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationDashboard {
  unread_count: number;
  by_severity: Record<string, number>;
  recent: Notification[];
}

export function fetchNotifications(unreadOnly = true, limit = 30): Promise<Notification[]> {
  return get<Notification[]>("/notifications/", { unread_only: unreadOnly, limit });
}

export function fetchUnreadCount(): Promise<{ unread_count: number }> {
  return get<{ unread_count: number }>("/notifications/unread-count/");
}

export function fetchNotificationDashboard(): Promise<NotificationDashboard> {
  return get<NotificationDashboard>("/notifications/dashboard/");
}

export function markNotificationRead(id: string): Promise<{ message: string }> {
  return post<{ message: string }>(`/notifications/${id}/read/`, {});
}

export function markAllNotificationsRead(): Promise<{ message: string }> {
  return post<{ message: string }>("/notifications/read-all/", {});
}
