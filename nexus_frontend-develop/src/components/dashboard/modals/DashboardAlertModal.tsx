import {
  Modal, Button, Table, Tag, Progress, Typography, Empty,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { PMOAlert, PMODashboard, PortfolioProject } from "@/services/dashboard";

const { Text } = Typography;

interface DashboardAlertModalProps {
  alert: PMOAlert | null;
  data: PMODashboard;
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export default function DashboardAlertModal({
  alert,
  data,
  open,
  onClose,
  onNavigate,
}: DashboardAlertModalProps) {
  if (!alert) return null;

  const projectModalColumns: ColumnsType<PortfolioProject> = [
    {
      title: "Project", key: "name", ellipsis: true,
      render: (_: unknown, r) => (
        <div>
          <code style={{ fontSize: 11, color: "var(--bms-primary)", marginRight: 6 }}>{r.code}</code>
          <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
        </div>
      ),
    },
    {
      title: "Due", key: "due", width: 110,
      render: (_: unknown, r) => {
        if (r.days_left == null) return "—";
        const color = r.days_left < 0 ? "var(--bms-danger)" : r.days_left < 14 ? "var(--bms-warning)" : "inherit";
        return (
          <span style={{ fontSize: 12, color }}>
            {r.days_left < 0 ? `${Math.abs(r.days_left)}d overdue` : `${r.days_left}d left`}
          </span>
        );
      },
    },
    {
      title: "Completion", dataIndex: "completion_pct", width: 110,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          showInfo={false}
          strokeColor={v >= 70 ? "var(--bms-success)" : v >= 40 ? "var(--bms-warning)" : "var(--bms-danger)"}
        />
      ),
    },
    {
      title: "Manager", dataIndex: "manager", width: 120, ellipsis: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v ?? "—"}</span>,
    },
  ];

  let rows: Record<string, unknown>[] = [];
  let columns: ColumnsType<Record<string, unknown>> = [];
  let rowKey = "id";
  let onRow: ((r: Record<string, unknown>) => { onClick?: () => void; style?: React.CSSProperties }) | undefined;

  switch (alert.key) {
    case "delayed_projects":
      rows = data.portfolio.projects.filter((p) => p.health === "DELAYED");
      columns = projectModalColumns as ColumnsType<Record<string, unknown>>;
      onRow = (r) => ({
        style: { cursor: "pointer" },
        onClick: () => onNavigate(`/projects/${r.id}`),
      });
      break;
    case "at_risk_projects":
      rows = data.portfolio.projects.filter((p) => p.health === "AT_RISK");
      columns = projectModalColumns as ColumnsType<Record<string, unknown>>;
      onRow = (r) => ({
        style: { cursor: "pointer" },
        onClick: () => onNavigate(`/projects/${r.id}`),
      });
      break;
    case "overdue_tickets":
      rows = (data.work_items.overdue_tickets ?? []) as Record<string, unknown>[];
      columns = [
        {
          title: "Ticket", key: "ticket", ellipsis: true,
          render: (_: unknown, r) => (
            <div>
              <code style={{ fontSize: 11, color: "var(--bms-primary)", marginRight: 6 }}>{r.ticket_id as string}</code>
              <Text style={{ fontSize: 13 }}>{r.title as string}</Text>
            </div>
          ),
        },
        {
          title: "Project", key: "project", width: 140, ellipsis: true,
          render: (_: unknown, r) => (
            <span style={{ fontSize: 12 }}>{(r.project_code as string) ?? "—"}</span>
          ),
        },
        {
          title: "Due", dataIndex: "due_date", width: 100,
          render: (v: string) => <span style={{ fontSize: 12 }}>{dayjs(v).format("DD MMM YYYY")}</span>,
        },
        {
          title: "Overdue", dataIndex: "days_overdue", width: 90,
          render: (v: number) => <Tag color="error">{v}d</Tag>,
        },
      ];
      onRow = (r) => ({
        style: { cursor: "pointer" },
        onClick: () => onNavigate(`/tickets/${r.id}`),
      });
      break;
    case "missing_timesheets":
      rows = (data.timesheet_week.missing_details ?? []) as Record<string, unknown>[];
      rowKey = "employee_id";
      columns = [
        { title: "Employee", dataIndex: "employee_name", ellipsis: true },
        {
          title: "Week", dataIndex: "week_start", width: 110,
          render: (v: string) => dayjs(v).format("DD MMM YYYY"),
        },
        {
          title: "Status", dataIndex: "status", width: 100,
          render: (v: string) => (
            <Tag color={v === "MISSING" ? "warning" : v === "REJECTED" ? "error" : "default"}>
              {v}
            </Tag>
          ),
        },
      ];
      onRow = () => ({
        style: { cursor: "pointer" },
        onClick: () => onNavigate("/timesheets/reporting"),
      });
      break;
    case "over_allocated":
      rows = (data.team.over_allocated ?? []) as Record<string, unknown>[];
      columns = [{ title: "Employee", dataIndex: "name", ellipsis: true }];
      onRow = (r) => ({
        style: { cursor: "pointer" },
        onClick: () => onNavigate(`/employees/${r.id}`),
      });
      break;
  }

  return (
    <Modal
      open={open}
      title={alert.title}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
        <Button key="open" type="primary" onClick={() => onNavigate(alert.path)}>
          Open full page
        </Button>,
      ]}
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
        {alert.detail}
      </Text>
      {rows.length > 0 ? (
        <Table
          dataSource={rows}
          columns={columns}
          rowKey={rowKey}
          size="small"
          pagination={rows.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
          scroll={{ x: 560 }}
          onRow={onRow}
        />
      ) : (
        <Empty description="No items to show" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Modal>
  );
}
