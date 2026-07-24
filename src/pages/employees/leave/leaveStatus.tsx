export const LEAVE_STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:              { color: "#d97706", bg: "#fffbeb", label: "pending" },
  PENDING_PROJECT_ACK:  { color: "#2563eb", bg: "#eff6ff", label: "awaiting ack" },
  PENDING_MANAGER:      { color: "#d97706", bg: "#fffbeb", label: "awaiting approval" },
  APPROVED:             { color: "#059669", bg: "#f0fdf4", label: "approved" },
  REJECTED:             { color: "#dc2626", bg: "#fff1f2", label: "rejected" },
  CANCELLED:            { color: "#6b7280", bg: "#f9fafb", label: "cancelled" },
};

export function LeaveStatusBadge({ status }: { status: string }) {
  const s = LEAVE_STATUS_STYLES[status] ?? { color: "#6b7280", bg: "#f9fafb", label: status.toLowerCase() };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
      color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
      textTransform: "lowercase",
    }}>
      {s.label}
    </span>
  );
}
