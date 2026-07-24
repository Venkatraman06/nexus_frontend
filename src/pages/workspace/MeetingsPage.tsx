import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Button, Tag, Space, message, Typography, Segmented, DatePicker,
  Select, Tooltip, Input, Badge,
  Skeleton, Avatar, Divider, Table,
} from "antd";
import {
  VideoCameraOutlined, TeamOutlined, CalendarOutlined,
  ClockCircleOutlined, CheckOutlined, UserOutlined,
  SearchOutlined, PlusOutlined,
  EyeOutlined,
  ClearOutlined, ArrowUpOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { followUpApi, FollowUpItem, FOLLOWUP_PRIORITIES } from "@/services/followups";
import { PERMS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";
import FollowUpDetailDrawer from "@/pages/followups/FollowUpDetailDrawer";
import { formatTimeRange } from "@/pages/followups/followupCalendarUtils";
import FollowUpCreateModal from "./FollowUpCreateModal";

const { Text } = Typography;


// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "",           label: "All Stages" },
  { value: "planning",   label: "Planning" },
  { value: "inprogress", label: "In Progress" },
  { value: "completed",  label: "Completed" },
  { value: "cancelled",  label: "Cancelled" },
];

const MODE_FILTER_OPTIONS = [
  { value: "",        label: "All Modes" },
  { value: "ONLINE",  label: "Online" },
  { value: "OFFLINE", label: "Offline" },
  { value: "NONE",    label: "Mode not set" },
];

const TAB_OPTIONS = [
  { value: "all",        label: "All" },
  { value: "upcoming",   label: "Upcoming" },
  { value: "completed",  label: "Completed" },
  { value: "cancelled",  label: "Cancelled" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function getMeetingDuration(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return null;
  const s = dayjs(startDate);
  const e = dayjs(endDate);
  const days = e.diff(s, "day");
  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  return "Same day";
}

function getStartsInLabel(date: string | null): string | null {
  if (!date) return null;
  const now = dayjs();
  const target = dayjs(date);
  if (target.isBefore(now, "day")) return null;
  const days = target.diff(now, "day");
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  const weeks = Math.floor(days / 7);
  return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
}

function getModeIcon(mode: string | null) {
  if (mode === "ONLINE") return <VideoCameraOutlined />;
  if (mode === "OFFLINE") return <TeamOutlined />;
  return <CalendarOutlined />;
}

function getModeColor(mode: string | null) {
  if (mode === "ONLINE") return "#3B82F6";
  if (mode === "OFFLINE") return "#0D9488";
  return "var(--pmt-text-3)";
}

function getModeBg(mode: string | null) {
  if (mode === "ONLINE") return "rgba(59, 130, 246, 0.1)";
  if (mode === "OFFLINE") return "rgba(13, 148, 136, 0.1)";
  return "var(--pmt-surface-2)";
}

function getSoftStatusStyle(hexColor: string | null | undefined) {
  const baseColor = hexColor || "#6366F1";
  return {
    background: baseColor,
    color: "#ffffff",
    border: `1px solid ${baseColor}`,
  };
}

// ─── Meeting Mode Tag ──────────────────────────────────────────────────────
function MeetingModeTag({ mode }: { mode: string | null }) {
  if (!mode) {
    return (
      <Tag style={{ borderRadius: 6, fontSize: 13, fontWeight: 600, background: "#5f6368", color: "#ffffff", border: "1px solid #5f6368", margin: 0, padding: "2px 10px", lineHeight: "22px" }}>
        -
      </Tag>
    );
  }
  const isOnline = mode === "ONLINE";
  return (
    <Tag
      icon={isOnline ? <VideoCameraOutlined style={{ color: "#ffffff" }} /> : <TeamOutlined style={{ color: "#ffffff" }} />}
      style={{
        borderRadius: 6, fontSize: 13, fontWeight: 600,
        background: isOnline ? "#3B82F6" : "#0D9488",
        color: "#ffffff",
        border: isOnline ? "1px solid #3B82F6" : "1px solid #0D9488",
        margin: 0,
        padding: "2px 10px", lineHeight: "22px",
      }}
    >
      {isOnline ? "Online" : "Offline"}
    </Tag>
  );
}

// ─── Priority Tag ──────────────────────────────────────────────────────────
function PriorityTag({ priority, label }: { priority: string; label?: string }) {
  const cfg = FOLLOWUP_PRIORITIES.find((p) => p.value === priority) ?? FOLLOWUP_PRIORITIES[2];
  return (
    <Tag style={{
      borderRadius: 6, fontSize: 13, fontWeight: 600, margin: 0,
      background: cfg.text,
      color: "#ffffff",
      border: `1px solid ${cfg.text}`,
      padding: "2px 10px", lineHeight: "22px",
    }}>
      {label ?? cfg.label}
    </Tag>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────
function SectionHeader({ icon, color, bg, title, subtitle }: {
  icon: React.ReactNode; color: string; bg: string; title: string; subtitle?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 16 }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--pmt-text)", letterSpacing: "-0.01em" }}>
          {title}
        </h3>
        {subtitle && <Text style={{ fontSize: 12, color: "var(--pmt-text-3)", marginTop: 1, display: "block" }}>{subtitle}</Text>}
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, desc, color, delay = 0 }: {
  label: string; value: number; icon: React.ReactNode; desc: string; color: string; delay?: number;
}) {
  const gradient = (() => {
    switch (color) {
      case "#6366F1": return "linear-gradient(135deg, #6366F1, #8B5CF6)";
      case "#F59E0B": return "linear-gradient(135deg, #F59E0B, #FBBF24)";
      case "#10B981": return "linear-gradient(135deg, #10B981, #34D399)";
      case "#3B82F6": return "linear-gradient(135deg, #3B82F6, #60A5FA)";
      case "#0D9488": return "linear-gradient(135deg, #0D9488, #14B8A6)";
      case "#EF4444": return "linear-gradient(135deg, #EF4444, #F87171)";
      default: return `linear-gradient(135deg, ${color}, ${color}dd)`;
    }
  })();

  return (
    <div
      className="ws-meeting-stat"
      style={{
        animation: `wsDashRevealUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both`,
        borderRadius: 12, overflow: "hidden",
        background: "var(--pmt-surface)",
        border: "1px solid var(--pmt-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 0.25s ease",
        position: "relative",
      }}
    >
      <div style={{ height: 3, background: gradient, width: "100%" }} />
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}15`, color, fontSize: 16,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--pmt-text)", lineHeight: 1.1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            {value}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--pmt-text-2)", marginTop: 2 }}>{label}</div>
          <div style={{ fontSize: 10, color: "var(--pmt-text-3)", marginTop: 1 }}>{desc}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 12, border: "1px solid var(--pmt-border)",
      background: "var(--pmt-surface)", padding: "14px 16px",
      display: "flex", gap: 14, alignItems: "flex-start",
    }}>
      <Skeleton.Avatar active size={40} shape="square" style={{ borderRadius: 10 }} />
      <div style={{ flex: 1 }}>
        <Skeleton active title={{ width: "60%" }} paragraph={{ rows: 2, width: ["80%", "40%"] }} />
      </div>
    </div>
  );
}

// ─── Meeting Card ──────────────────────────────────────────────────────────
function MeetingCard({
  item,
  priorityCfg,
  timeRange,
  isCompleted,
  isCancelled,
  canTransition,
  isPending,
  onDone,
  onClick,
}: {
  item: FollowUpItem;
  priorityCfg: typeof FOLLOWUP_PRIORITIES[number];
  timeRange: string | null;
  isCompleted: boolean;
  isCancelled: boolean;
  canTransition: boolean;
  isPending: boolean;
  onDone: () => void;
  onClick: () => void;
}) {
  const modeIcon = getModeIcon(item.meeting_mode);
  const modeBg = getModeBg(item.meeting_mode);
  const modeColor = getModeColor(item.meeting_mode);
  const startsIn = !isCompleted && !isCancelled ? getStartsInLabel(item.start_date) : null;
  const duration = getMeetingDuration(item.start_date, item.end_date);
  const assigneeData = item.assignees_data || [];

  // Participants
  const showAvatars = assigneeData.length > 0;
  const maxAvatars = 3;

  return (
    <div
      className="ws-meeting-item"
      style={{
        display: "flex", gap: 14,
        padding: "14px 16px",
        background: isCancelled ? "color-mix(in srgb, var(--pmt-surface) 90%, transparent)" : "var(--pmt-surface)",
        border: `1px solid ${
          isCompleted ? "rgba(16, 185, 129, 0.3)"
          : isCancelled ? "color-mix(in srgb, var(--pmt-border) 70%, transparent)"
          : "var(--pmt-border)"
        }`,
        borderRadius: 12, cursor: "pointer",
        opacity: isCancelled ? 0.55 : 1,
        transition: "all 0.2s ease",
        boxShadow: isCompleted ? "0 1px 3px rgba(16, 185, 129, 0.06)" : "0 1px 2px rgba(0,0,0,0.04)",
        position: "relative", overflow: "hidden",
      }}
      onClick={() => onClick()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 10, bottom: 10,
        width: 3, borderRadius: "0 3px 3px 0",
        background: isCompleted ? "#10B981" : isCancelled ? "#94A3B8" : priorityCfg.accent,
      }} />

      {/* Mode icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: modeBg, color: modeColor, fontSize: 18,
        boxShadow: `0 2px 6px ${modeColor}18`,
      }}>
        {modeIcon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            <Text strong style={{
              fontSize: 14, color: "var(--pmt-text)",
              textDecoration: isCompleted ? "line-through" : undefined,
              lineHeight: 1.35, flex: 1, minWidth: 0,
            }} ellipsis={{ tooltip: item.title }}>
              {item.title}
            </Text>
            {item.is_overdue && !isCompleted && !isCancelled && (
              <Tag style={{
                borderRadius: 6, fontSize: 9, fontWeight: 700, margin: 0,
                background: "#c5221f", color: "#fff", border: "none",
                padding: "0 6px", lineHeight: "18px",
              }}>
                Overdue
              </Tag>
            )}
            {startsIn && (
              <Tooltip title={`Starts on ${dayjs(item.start_date).format("MMM D, YYYY")}`}>
                <Tag icon={<FieldTimeOutlined />} color="blue" style={{ borderRadius: 6, fontSize: 9, fontWeight: 600, margin: 0, lineHeight: "18px", padding: "0 6px" }}>
                  {startsIn}
                </Tag>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Tags row */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          <MeetingModeTag mode={item.meeting_mode} />
          <PriorityTag priority={item.priority || "MEDIUM"} label={item.priority_label} />
          <Tag style={{
            ...getSoftStatusStyle(item.workflow_state_color),
            margin: 0,
            borderRadius: 6, fontSize: 10, fontWeight: 600,
            padding: "0 8px", lineHeight: "18px",
          }}>
            {item.workflow_state_name}
          </Tag>
          {duration && (
            <Tag style={{
              borderRadius: 6, fontSize: 10, fontWeight: 600, margin: 0,
              background: "#5f6368", color: "#ffffff", border: "1px solid #5f6368",
              padding: "0 6px", lineHeight: "18px",
            }}>
              <ClockCircleOutlined style={{ marginRight: 3, color: "#ffffff" }} />{duration}
            </Tag>
          )}
        </div>

        {/* Meta row */}
        <div style={{ fontSize: 12, color: "var(--pmt-text-2)", display: "flex", flexWrap: "wrap", gap: "2px 16px", alignItems: "center" }}>
          {(item.start_date || item.end_date) && (
            <Tooltip title={item.start_date ? dayjs(item.start_date).format("dddd, MMMM D, YYYY") : ""}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CalendarOutlined style={{ fontSize: 10 }} />
                {item.start_date ? dayjs(item.start_date).format("MMM D, YYYY") : ""}
                {item.end_date && item.end_date !== item.start_date
                  ? ` — ${dayjs(item.end_date).format("MMM D")}` : ""}
              </span>
            </Tooltip>
          )}
          {timeRange && (
            <Tooltip title="Meeting time">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ClockCircleOutlined style={{ fontSize: 10 }} />{timeRange}
              </span>
            </Tooltip>
          )}
          {item.reporter_name && (
            <Tooltip title={`Organizer: ${item.reporter_name}`}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <UserOutlined style={{ fontSize: 10 }} />{item.reporter_name}
              </span>
            </Tooltip>
          )}
        </div>

        {/* Description */}
        {item.description ? (
          <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: "block", lineHeight: 1.4, color: "var(--pmt-text-3)" }} ellipsis>
            {item.description}
          </Text>
        ) : null}

        {/* Avatars row */}
        {showAvatars && (
          <div style={{ marginTop: 8 }}>
            <Tooltip title={assigneeData.map(a => a.full_name).join(", ")}>
              <Avatar.Group max={{ count: maxAvatars, style: { backgroundColor: "var(--pmt-primary)", fontSize: 10, cursor: "pointer" } }} size="small">
                {assigneeData.map((a) => (
                  <Tooltip key={a.id} title={a.full_name}>
                    <Avatar style={{ backgroundColor: "#6366F1", fontSize: 10, verticalAlign: "middle" }} size="small">
                      {a.full_name.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </Avatar.Group>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function MeetingsPage() {
  const qc = useQueryClient();
  const permissions = useAuthStore((s) => s.permissions);
  const userId = useAuthStore((s) => s.user?.id);

  const canTransition = permissions.includes(PERMS.CRM_FOLLOWUP_TRANSITION as never);
  const canViewAll    = permissions.includes(PERMS.CRM_FOLLOWUP_VIEW_ALL as never);
  const canCreate     = permissions.includes(PERMS.CRM_FOLLOWUP_CREATE as never);

  // ── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]          = useState("all");
  const [statusFilter, setStatusFilter]    = useState("");
  const [modeFilter, setModeFilter]        = useState("");
  const [searchQuery, setSearchQuery]      = useState("");

  const [detailItem, setDetailItem]        = useState<FollowUpItem | null>(null);
  const [createOpen, setCreateOpen]        = useState(false);
  const [dateRange, setDateRange]          = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [showBackToTop, setShowBackToTop]  = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["meetings-list", userId],
    queryFn: () => followUpApi.listAll({ type: "MEETING" }),
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["meetings-list"] });
    qc.invalidateQueries({ queryKey: ["followups-board"] });
    qc.invalidateQueries({ queryKey: ["followups-list"] });
    qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
  }, [qc]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const transitionMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: string }) =>
      followUpApi.transition(id, state),
    onSuccess: () => {
      message.success("Meeting marked as completed");
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(msg || "Cannot update meeting status");
    },
  });

  const today = dayjs();

  // ── Derived: filtered & sorted data ──────────────────────────────────────
  const filtered = useMemo(() => {
    let items = data ?? [];

    // Permission filter
    if (!canViewAll && userId) {
      items = items.filter((i) => i.assignee === userId || i.reporter === userId);
    }

    // Tab filter
    if (activeTab === "upcoming") {
      items = items.filter((i) => {
        const final = i.workflow_state_slug === "completed" || i.workflow_state_slug === "cancelled";
        if (final) return false;
        if (!i.end_date) return true;
        return dayjs(i.end_date).isSameOrAfter(today, "day");
      });
    } else if (activeTab === "completed") {
      items = items.filter((i) => i.workflow_state_slug === "completed");
    } else if (activeTab === "cancelled") {
      items = items.filter((i) => i.workflow_state_slug === "cancelled");
    }

    // Status filter
    if (statusFilter) {
      items = items.filter((i) => i.workflow_state_slug === statusFilter);
    }

    // Mode filter
    if (modeFilter === "NONE") {
      items = items.filter((i) => !i.meeting_mode);
    } else if (modeFilter) {
      items = items.filter((i) => i.meeting_mode === modeFilter);
    }

    // Date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const from = dateRange[0].format("YYYY-MM-DD");
      const to = dateRange[1].format("YYYY-MM-DD");
      items = items.filter((i) => {
        const d = i.start_date || i.end_date;
        return d && d >= from && d <= to;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.reporter_name?.toLowerCase().includes(q) ||
        i.assignees_data?.some((a) => a.full_name.toLowerCase().includes(q))
      );
    }

    // Sort: upcoming by default
    items = [...items].sort((a, b) => {
      const aD = a.start_date ?? a.end_date ?? "9999";
      const bD = b.start_date ?? b.end_date ?? "9999";
      return aD < bD ? -1 : aD > bD ? 1 : 0;
    });

    return items;
  }, [data, canViewAll, userId, activeTab, statusFilter, modeFilter, dateRange, searchQuery, today]);

  // ── Derived: stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = data ?? [];
    const mine = canViewAll ? all : all.filter((i) => i.assignee === userId || i.reporter === userId);
    return {
      total:     mine.length,
      upcoming:  mine.filter((i) => {
        const final = i.workflow_state_slug === "completed" || i.workflow_state_slug === "cancelled";
        if (final) return false;
        return !i.end_date || dayjs(i.end_date).isSameOrAfter(today, "day");
      }).length,
      completed: mine.filter((i) => i.workflow_state_slug === "completed").length,
      online:    mine.filter((i) => i.meeting_mode === "ONLINE").length,
      offline:   mine.filter((i) => i.meeting_mode === "OFFLINE").length,
    };
  }, [data, canViewAll, userId, today]);

  // ── Back to top ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ── Has any active filter? ───────────────────────────────────────────────
  const hasFilters = statusFilter || modeFilter || searchQuery || activeTab !== "all" || dateRange !== null;

  const clearFilters = () => {
    setStatusFilter("");
    setModeFilter("");
    setSearchQuery("");
    setActiveTab("all");
    setDateRange(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes wsDashFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wsDashRevealUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .ws-meeting-stat:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.07);
        }
        .ws-meeting-item:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 14px rgba(0,0,0,0.06);
        }
        .ws-meeting-item:focus-visible {
          outline: 2px solid var(--pmt-primary);
          outline-offset: 2px;
        }
        .ws-back-to-top {
          position: fixed; bottom: 32px; right: 32px; z-index: 100;
          animation: wsDashRevealUp 0.3s ease;
        }
        @media (max-width: 768px) {
          .ws-meeting-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .ws-meeting-filters {
            flex-direction: column;
          }
          .ws-meeting-filters .ant-select,
          .ws-meeting-filters .ant-input-search {
            width: 100% !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1480, margin: "0 auto", animation: "wsDashFadeIn 0.5s ease-out" }}>
        {/* ── Header Section ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24, animation: "wsDashRevealUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <SectionHeader
              icon={<CalendarOutlined />}
              color="#6366F1" bg="rgba(99, 102, 241, 0.12)"
              title="Meetings"
              subtitle={canViewAll ? "All meetings across the team" : "Meetings assigned to or created by you"}
            />
            <Space wrap>
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateOpen(true)}
                  style={{
                    borderRadius: 10, height: 38, fontWeight: 600, fontSize: 13,
                    display: "flex", alignItems: "center", gap: 6,
                    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                    border: "none", boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                  }}
                >
                  Schedule Meeting
                </Button>
              )}
            </Space>
          </div>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────────────── */}
        <div className="ws-meeting-stats-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12, marginBottom: 24,
        }}>
          <StatCard label="Total" value={stats.total} icon={<CalendarOutlined />} desc="All meetings" color="#6366F1" delay={0.06} />
          <StatCard label="Upcoming" value={stats.upcoming} icon={<FieldTimeOutlined />} desc="Waiting to start" color="#F59E0B" delay={0.12} />
          <StatCard label="Completed" value={stats.completed} icon={<CheckOutlined />} desc="Finished meetings" color="#10B981" delay={0.18} />
          <StatCard label="Online" value={stats.online} icon={<VideoCameraOutlined />} desc="Virtual meetings" color="#3B82F6" delay={0.24} />
          <StatCard label="Offline" value={stats.offline} icon={<TeamOutlined />} desc="In-person meetings" color="#0D9488" delay={0.3} />
        </div>

        {/* ── Filter Toolbar ──────────────────────────────────────────────── */}
        <div className="ws-meeting-filters" style={{
          display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
          padding: "12px 16px", borderRadius: 12,
          background: "var(--pmt-surface)", border: "1px solid var(--pmt-border)",
          animation: "wsDashRevealUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both",
        }}>
          {/* Search */}
          <Input.Search
            placeholder="Search meetings..."
            allowClear
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined style={{ color: "var(--pmt-text-3)" }} />}
          />

          <Divider type="vertical" style={{ height: 24, background: "var(--pmt-border)" }} />

          {/* Result count */}
          <Text style={{ fontSize: 12, color: "var(--pmt-text-2)", whiteSpace: "nowrap" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>

          <Divider type="vertical" style={{ height: 24, background: "var(--pmt-border)" }} />

          {/* Tabs */}
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as string)}
            options={TAB_OPTIONS}
            style={{ fontSize: 12 }}
          />

          <Divider type="vertical" style={{ height: 24, background: "var(--pmt-border)" }} />

          {/* Status filter */}
          <Select
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || "")}
            placeholder="Stage"
            allowClear
            style={{ width: 120 }}
            options={STATUS_OPTIONS.filter((o) => o.value).map((o) => ({ value: o.value, label: o.label }))}
            size="small"
          />

          {/* Mode filter */}
          <Select
            value={modeFilter || undefined}
            onChange={(v) => setModeFilter(v || "")}
            placeholder="Mode"
            allowClear
            style={{ width: 120 }}
            options={MODE_FILTER_OPTIONS.filter((o) => o.value).map((o) => ({ value: o.value, label: o.label }))}
            size="small"
          />

          {/* Date Range */}
          <DatePicker.RangePicker
            size="small"
            value={dateRange as any}
            onChange={(dates) => setDateRange(dates as any)}
            style={{ width: 210 }}
            placeholder={["Start date", "End date"]}
          />

          {/* Clear filters */}
          {hasFilters && (
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={clearFilters}
              style={{ borderRadius: 8, fontSize: 11, height: 28 }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* ── Meeting List ────────────────────────────────────────────────── */}
        <div style={{ animation: "wsDashRevealUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.36s both" }}>
          {/* Section title */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Text strong style={{ fontSize: 16, fontWeight: 700, color: "var(--pmt-text)" }}>
              Your Meetings
            </Text>
            <Badge count={filtered.length} showZero
              style={{ backgroundColor: "var(--pmt-primary)", fontSize: 10, fontWeight: 600, boxShadow: "none" }} />
          </div>

          {/* Content */}
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", animation: "wsDashFadeIn 0.5s ease" }}>
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                background: "var(--pmt-surface-2)",
                border: "2px dashed var(--pmt-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <CalendarOutlined style={{ fontSize: 36, color: "var(--pmt-text-3)" }} />
              </div>
              <Text style={{ fontSize: 16, fontWeight: 600, color: "var(--pmt-text)", display: "block", marginBottom: 6 }}>
                {hasFilters ? "No meetings match your filters" : "No meetings scheduled"}
              </Text>
              <Text style={{ fontSize: 13, color: "var(--pmt-text-2)", display: "block", marginBottom: 20 }}>
                {hasFilters
                  ? "Try adjusting your search or filter criteria."
                  : "Schedule your first meeting to get started."}
              </Text>
              {!hasFilters && canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateOpen(true)}
                  style={{
                    borderRadius: 10, fontWeight: 600,
                    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                    border: "none", boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                  }}
                >
                  Schedule Meeting
                </Button>
              )}
            </div>
          ) : (
            <Table
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
              columns={[
                {
                  title: "Title",
                  dataIndex: "title",
                  key: "title",
                  render: (text: string, record: FollowUpItem) => (
                    <a onClick={() => setDetailItem(record)} style={{ fontWeight: 600, color: "var(--pmt-text)", fontSize: 14 }}>{text}</a>
                  )
                },
                {
                  title: "Mode",
                  dataIndex: "meeting_mode",
                  key: "meeting_mode",
                  render: (mode: string | null) => <MeetingModeTag mode={mode} />
                },
                {
                  title: "Priority",
                  key: "priority",
                  render: (_: any, record: FollowUpItem) => (
                    record.priority
                      ? <PriorityTag priority={record.priority} label={record.priority_label} />
                      : <span style={{ color: "var(--pmt-text-3)" }}>-</span>
                  )
                },
                {
                  title: "Status",
                  key: "status",
                  render: (_: any, record: FollowUpItem) => (
                    record.workflow_state_name
                      ? (
                        <Tag style={{
                          ...getSoftStatusStyle(record.workflow_state_color),
                          margin: 0,
                          borderRadius: 6, fontSize: 13, fontWeight: 600,
                          padding: "2px 10px", lineHeight: "22px",
                        }}>
                          {record.workflow_state_name}
                        </Tag>
                      )
                      : <span style={{ color: "var(--pmt-text-3)" }}>-</span>
                  )
                },
                {
                  title: "Date & Time",
                  key: "datetime",
                  render: (_: any, record: FollowUpItem) => {
                    const dateStr = record.start_date ? dayjs(record.start_date).format("MMM D, YYYY") : "-";
                    const endStr = record.end_date && record.end_date !== record.start_date ? ` — ${dayjs(record.end_date).format("MMM D")}` : "";
                    const timeRange = formatTimeRange(record.start_time, record.end_time);
                    return (
                      <div style={{ fontSize: 14 }}>
                        <div style={{ color: "var(--pmt-text)", whiteSpace: "nowrap" }}>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {dateStr}{endStr}
                        </div>
                        {timeRange && (
                          <div style={{ color: "var(--pmt-text-2)", fontSize: 13, marginTop: 4, whiteSpace: "nowrap" }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {timeRange}
                          </div>
                        )}
                      </div>
                    );
                  }
                },
                {
                  title: "Assignees",
                  key: "assignees",
                  render: (_: any, record: FollowUpItem) => {
                    const assigneeData = record.assignees_data || [];
                    if (assigneeData.length === 0) return "-";
                    return (
                      <Avatar.Group max={{ count: 3, style: { backgroundColor: "var(--pmt-primary)", fontSize: 13 } }}>
                        {assigneeData.map((a) => (
                          <Tooltip key={a.id} title={a.full_name}>
                            <Avatar style={{ backgroundColor: "#6366F1", fontSize: 13 }}>
                              {a.full_name.charAt(0).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Avatar.Group>
                    );
                  }
                },
                {
                  title: "Starts In",
                  key: "starts_in",
                  render: (_: any, record: FollowUpItem) => {
                    const isCompleted = record.workflow_state_slug === "completed";
                    const isCancelled = record.workflow_state_slug === "cancelled";
                    const startsIn = !isCompleted && !isCancelled ? getStartsInLabel(record.start_date) : null;
                    if (record.is_overdue && !isCompleted && !isCancelled) {
                      return <Tag color="error" style={{ borderRadius: 6, margin: 0 }}>Overdue</Tag>;
                    }
                    if (startsIn) {
                      return (
                        <Tag icon={<FieldTimeOutlined />} color="blue" style={{ borderRadius: 6, fontSize: 13, fontWeight: 600, margin: 0, padding: "2px 10px", lineHeight: "22px" }}>
                          {startsIn}
                        </Tag>
                      );
                    }
                    return "-";
                  }
                }
              ]}
              scroll={{ x: 800 }}
              style={{
                border: "1px solid var(--pmt-border)",
                borderRadius: 12,
                overflow: "hidden"
              }}
            />
          )}
        </div>

        {/* ── Back to Top ─────────────────────────────────────────────────── */}
        {showBackToTop && (
          <Tooltip title="Back to top">
            <Button
              type="primary"
              shape="circle"
              icon={<ArrowUpOutlined />}
              onClick={scrollToTop}
              className="ws-back-to-top"
              style={{
                width: 40, height: 40,
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                border: "none",
              }}
            />
          </Tooltip>
        )}

        {/* ── Detail Drawer ───────────────────────────────────────────────── */}
        <FollowUpDetailDrawer
          item={detailItem}
          open={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          onEdit={() => setDetailItem(null)}
          onDone={(item) => transitionMutation.mutate({ id: item.id, state: "completed" })}
          onDelete={() => { setDetailItem(null); invalidate(); }}
          canUpdate={false}
          canDelete={false}
          canTransition={canTransition}
        />

        {/* ── Create Modal ────────────────────────────────────────────────── */}
        <FollowUpCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); invalidate(); }}
          defaultType="MEETING"
        />
      </div>
    </>
  );
}
