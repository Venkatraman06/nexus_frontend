import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Empty, Popover, Spin, Tooltip, Typography } from "antd";
import {
  BellOutlined,
  CheckOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  WalletOutlined,
  DownOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "@/services/notifications";

const { Text } = Typography;

const PREVIEW_LIMIT = 3;

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  info: <InfoCircleOutlined style={{ color: "#1677ff", fontSize: 13 }} />,
  warning: <WarningOutlined style={{ color: "#faad14", fontSize: 13 }} />,
  urgent: <ExclamationCircleOutlined style={{ color: "#ff4d4f", fontSize: 13 }} />,
};

const CATEGORIES = [
  { key: "followup", label: "Follow-ups", prefix: "followup.", icon: <CalendarOutlined /> },
  { key: "ticket", label: "Tickets", prefix: "ticket.", icon: <FileTextOutlined /> },
  { key: "project", label: "Projects", prefix: "project.", icon: <ProjectOutlined /> },
  { key: "timesheet", label: "Timesheets", prefix: "timesheet.", icon: <ClockCircleOutlined /> },
  { key: "hr", label: "HR & People", prefixes: ["employee.", "leave.", "payroll."], icon: <TeamOutlined /> },
  { key: "finance", label: "Finance", prefixes: ["invoice.", "milestone.", "payment."], icon: <WalletOutlined /> },
] as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function matchCategory(eventType: string) {
  for (const cat of CATEGORIES) {
    if ("prefix" in cat && eventType.startsWith(cat.prefix)) return cat;
    if ("prefixes" in cat && cat.prefixes.some((p) => eventType.startsWith(p))) return cat;
  }
  return { key: "other", label: "Other", icon: <BellOutlined /> };
}

function compactTitle(notif: Notification): string {
  const meta = notif.metadata ?? {};
  const rawTitle = typeof meta.title === "string" ? meta.title : "";
  if (rawTitle) return rawTitle.replace(/^\[SEED-PMO\]\s*/, "").trim();

  const quoted = notif.message.match(/^"([^"]+)"/);
  if (quoted?.[1]) return quoted[1].replace(/^\[SEED-PMO\]\s*/, "").trim();

  if (notif.event_type.startsWith("project.allocation") && typeof meta.project_name === "string") {
    return meta.project_name;
  }
  if (notif.event_type.startsWith("timesheet.") && typeof meta.employee_name === "string") {
    return meta.employee_name;
  }

  return notif.title
    .replace(/^Follow-up today:\s*/i, "")
    .replace(/^Follow-up overdue:\s*/i, "")
    .replace(/^Ticket due today:\s*/i, "")
    .replace(/^Ticket assigned:\s*/i, "")
    .trim();
}

function compactSubtitle(notif: Notification): string | null {
  if (notif.event_type === "followup.due_today") return "Due today";
  if (notif.event_type === "followup.overdue") {
    const days = notif.metadata?.days_overdue;
    return typeof days === "number" ? `${days}d overdue` : "Overdue";
  }
  if (notif.event_type === "project.allocation") return "New allocation";
  if (notif.event_type === "timesheet.submitted") return "Submitted";
  if (notif.event_type === "timesheet.approved") return "Approved";
  if (notif.event_type === "timesheet.rejected") return "Rejected";
  if (notif.event_type === "ticket.due_today") return "Due today";
  if (notif.event_type === "ticket.assigned") return "Assigned";
  return null;
}

interface NotificationBellProps {
  iconColor?: string;
}

export default function NotificationBell({ iconColor = "inherit" }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [list, countRes] = await Promise.all([
        fetchNotifications(true, 50),
        fetchUnreadCount(),
      ]);
      setItems(list);
      setUnreadCount(countRes.unread_count);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, { cat: typeof CATEGORIES[number] | { key: string; label: string; icon: React.ReactNode }; items: Notification[] }>();

    for (const notif of items) {
      const cat = matchCategory(notif.event_type);
      const key = cat.key;
      if (!map.has(key)) map.set(key, { cat, items: [] });
      map.get(key)!.items.push(notif);
    }

    const order = [...CATEGORIES.map((c) => c.key), "other"];
    return order
      .filter((key) => map.has(key))
      .map((key) => map.get(key)!);
  }, [items]);

  const handleOpenChange = (visible: boolean) => {
    setOpen(visible);
    if (visible) {
      setLoading(true);
      load().finally(() => setLoading(false));
    }
  };

  const handleClick = async (notif: Notification) => {
    try {
      await markNotificationRead(notif.id);
      setItems((prev) => prev.filter((n) => n.id !== notif.id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* proceed */
    }
    setOpen(false);
    if (notif.action_url) navigate(notif.action_url);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setItems([]);
    setUnreadCount(0);
  };

  const toggleCategory = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleShowAll = (key: string) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const content = (
    <div style={{ width: 340, maxHeight: 440, display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "2px 2px 10px",
        borderBottom: "1px solid var(--bms-border, #e8edf2)",
      }}>
        <Text strong style={{ fontSize: 14 }}>Notifications</Text>
        {items.length > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkAll} style={{ fontSize: 12 }}>
            Mark all read
          </Button>
        )}
      </div>

      <div style={{ overflowY: "auto", flex: 1, marginTop: 6 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 28 }}><Spin size="small" /></div>
        ) : items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No unread notifications"
            style={{ padding: "20px 0" }}
          />
        ) : (
          grouped.map(({ cat, items: catItems }) => {
            const isCollapsed = collapsed[cat.key];
            const showAll = expandedItems[cat.key];
            const visible = showAll ? catItems : catItems.slice(0, PREVIEW_LIMIT);
            const hiddenCount = catItems.length - visible.length;

            return (
              <div key={cat.key} style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    border: "none",
                    background: "var(--bms-surface-2, #f8fafc)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    marginBottom: isCollapsed ? 0 : 4,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--bms-text-2, #64748b)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    <span style={{ fontSize: 12, display: "inline-flex" }}>{cat.icon}</span>
                    {cat.label}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: "var(--bms-surface, #fff)",
                      border: "1px solid var(--bms-border, #e2e8f0)",
                      borderRadius: 10,
                      padding: "0 6px",
                      lineHeight: "18px",
                    }}>
                      {catItems.length}
                    </span>
                  </span>
                  {isCollapsed ? <RightOutlined style={{ fontSize: 10, color: "#94a3b8" }} /> : <DownOutlined style={{ fontSize: 10, color: "#94a3b8" }} />}
                </button>

                {!isCollapsed && visible.map((notif) => {
                  const subtitle = compactSubtitle(notif);
                  return (
                    <Tooltip key={notif.id} title={notif.message} placement="left">
                      <div
                        onClick={() => handleClick(notif)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 8px",
                          marginBottom: 2,
                          cursor: "pointer",
                          borderRadius: 6,
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "var(--bms-hover, rgba(22,119,255,0.06))";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span style={{ flexShrink: 0, width: 16, display: "flex", justifyContent: "center" }}>
                          {SEVERITY_ICON[notif.severity] || SEVERITY_ICON.info}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
                            <Text strong style={{
                              fontSize: 12,
                              lineHeight: 1.3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}>
                              {compactTitle(notif)}
                            </Text>
                            <Text style={{ fontSize: 10, color: "var(--bms-text-3, #94a3b8)", flexShrink: 0 }}>
                              {timeAgo(notif.created_at)}
                            </Text>
                          </div>
                          {subtitle && (
                            <Text style={{ fontSize: 10, color: "var(--bms-text-3, #94a3b8)", lineHeight: 1.2 }}>
                              {subtitle}
                            </Text>
                          )}
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}

                {!isCollapsed && hiddenCount > 0 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => toggleShowAll(cat.key)}
                    style={{ fontSize: 11, padding: "0 8px", height: 24 }}
                  >
                    {showAll ? "Show less" : `Show ${hiddenCount} more`}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      overlayInnerStyle={{ padding: 12 }}
    >
      <div className="bms-header-icon-btn" style={{ position: "relative" }}>
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined style={{ fontSize: 16, color: iconColor }} />
        </Badge>
      </div>
    </Popover>
  );
}
