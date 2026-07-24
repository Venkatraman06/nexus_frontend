import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Progress, Typography, Tabs, Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Column } from "@ant-design/charts";
import {
  FileTextOutlined, DollarOutlined, WarningOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import {
  DashboardShell,
  DashboardHeader,
  DashboardGrid,
  DashboardPanel,
  AttentionQueue,
  QuickActionBar,
  ActionMetric,
  HealthRing,
  TrendPanel,
  DashboardPageSkeleton,
  type AttentionItem,
  type QuickAction,
} from "@/components/dashboard";
import { paymentReportsApi, type ClientReceivable, type ProjectReceivable, type MonthlyTrend } from "@/services/payment";
import PercentChip from "@/components/common/PercentChip";
import { useThemeStore } from "@/store/theme";

const { Text } = Typography;

function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtCurrency(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function PaymentDashboardPage() {
  const navigate = useNavigate();
  const [receivableTab, setReceivableTab] = useState<"client" | "project">("client");
  const isDark = useThemeStore((s) => s.isDark);

  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-dashboard"],
    queryFn: paymentReportsApi.dashboard,
    staleTime: 30_000,
  });

  const { data: clientData } = useQuery({
    queryKey: ["payment-client-receivable"],
    queryFn: paymentReportsApi.clientReceivable,
    staleTime: 60_000,
  });

  const { data: projectData } = useQuery({
    queryKey: ["payment-project-receivable"],
    queryFn: paymentReportsApi.projectReceivable,
    staleTime: 60_000,
  });

  const kpi = data?.kpi;
  const trend: MonthlyTrend[] = data?.monthly_trend ?? [];
  const clients: ClientReceivable[] = clientData?.results ?? [];
  const projects: ProjectReceivable[] = projectData?.results ?? [];

  const attentionItems = useMemo((): AttentionItem[] => {
    if (!kpi) return [];
    const items: AttentionItem[] = [];
    if (kpi.overdue_count > 0) {
      items.push({
        key: "overdue",
        severity: "error",
        title: "Overdue invoices",
        count: kpi.overdue_count,
        detail: `${fmt(kpi.overdue_amount)} past due — chase collections`,
        path: "/payment/invoices",
      });
    }
    if (kpi.partial_count > 0) {
      items.push({
        key: "partial",
        severity: "warning",
        title: "Partial payments",
        count: kpi.partial_count,
        detail: "Invoices with outstanding balance after partial collection",
        path: "/payment/invoices",
      });
    }
    if (kpi.collection_pct < 80 && kpi.total_invoiced > 0) {
      items.push({
        key: "collection",
        severity: "warning",
        title: "Collection rate low",
        count: Math.round(kpi.collection_pct),
        detail: `Only ${kpi.collection_pct.toFixed(1)}% of invoiced amount collected`,
        path: "/payment/receivables",
      });
    }
    if (kpi.total_receivable > 0) {
      items.push({
        key: "outstanding",
        severity: "info",
        title: "Outstanding AR",
        count: Math.round(kpi.total_receivable / 1000),
        detail: `${fmt(kpi.total_receivable)} total receivable across clients`,
        path: "/payment/receivables",
      });
    }
    return items;
  }, [kpi]);

  const clientRows = useMemo(
    () => [...clients].sort((a, b) => b.total_pending - a.total_pending || b.overdue_amount - a.overdue_amount),
    [clients],
  );

  const projectRows = useMemo(
    () => [...projects].sort((a, b) => b.total_pending - a.total_pending || b.overdue_amount - a.overdue_amount),
    [projects],
  );

  const clientColumns: ColumnsType<ClientReceivable> = useMemo(() => [
    { title: "Client", dataIndex: "client_name", render: (v) => <Text strong>{v}</Text> },
    { title: "Invoiced", dataIndex: "total_invoiced", align: "right", render: (v) => fmtCurrency(v) },
    { title: "Received", dataIndex: "total_received", align: "right", render: (v) => <Text style={{ color: "var(--pmt-success)" }}>{fmtCurrency(v)}</Text> },
    {
      title: "Pending", dataIndex: "total_pending", align: "right",
      render: (v) => <Text strong style={{ color: v > 0 ? "var(--pmt-danger)" : "var(--pmt-success)" }}>{fmtCurrency(v)}</Text>,
    },
    {
      title: "Status", key: "status", width: 100,
      render: (_, r) => (
        <Tag color={r.overdue_amount > 0 ? "error" : r.total_pending > 0 ? "warning" : "success"} style={{ margin: 0 }}>
          {r.overdue_amount > 0 ? "Overdue" : r.total_pending > 0 ? "Pending" : "Clear"}
        </Tag>
      ),
    },
    { title: "Invoices", dataIndex: "invoice_count", align: "center", width: 80 },
    {
      title: "Collection %", dataIndex: "collection_pct", width: 120, align: "right" as const,
      render: (v) => <PercentChip value={v} mode="higher-better" decimals={0} />,
    },
  ], []);

  const projectColumns: ColumnsType<ProjectReceivable> = useMemo(() => [
    {
      title: "Project", key: "project",
      render: (_, r) => (
        <div>
          <Tag color="blue" style={{ marginRight: 6 }}>{r.project_code}</Tag>
          <Text>{r.project_name}</Text>
        </div>
      ),
    },
    { title: "Client", dataIndex: "client_name" },
    { title: "Invoiced", dataIndex: "total_invoiced", align: "right", render: (v) => fmtCurrency(v) },
    { title: "Received", dataIndex: "total_received", align: "right", render: (v) => <Text style={{ color: "var(--pmt-success)" }}>{fmtCurrency(v)}</Text> },
    {
      title: "Outstanding", dataIndex: "total_pending", align: "right",
      render: (v) => <Text strong style={{ color: v > 0 ? "var(--pmt-danger)" : "var(--pmt-success)" }}>{fmtCurrency(v)}</Text>,
    },
    {
      title: "Status", key: "status", width: 100,
      render: (_, r) => (
        <Tag color={r.overdue_amount > 0 ? "error" : r.total_pending > 0 ? "warning" : "success"} style={{ margin: 0 }}>
          {r.overdue_amount > 0 ? "Overdue" : r.total_pending > 0 ? "Pending" : "Clear"}
        </Tag>
      ),
    },
    { title: "Invoices", dataIndex: "invoice_count", align: "center", width: 80 },
    {
      title: "Collection %", dataIndex: "collection_pct", width: 120, align: "right" as const,
      render: (v) => <PercentChip value={v} mode="higher-better" decimals={0} />,
    },
  ], []);

  const quickActions = useMemo((): QuickAction[] => [
    { key: "invoices", label: "Invoices", icon: <FileTextOutlined />, onClick: () => navigate("/payment/invoices"), primary: true },
    { key: "payments", label: "Record payment", icon: <DollarOutlined />, onClick: () => navigate("/payment/payments") },
    { key: "receivables", label: "Receivable summary", icon: <WarningOutlined />, onClick: () => navigate("/payment/receivables") },
    { key: "milestones", label: "Milestones", icon: <CheckCircleOutlined />, onClick: () => navigate("/payment/milestones") },
  ], [navigate]);

  // Determine chart colors based on theme
  const chartColors = isDark
    ? ['#52c41a', '#faad14'] // Brighter colors for dark mode
    : ['#059669', '#6366f1'];

  const trendData = useMemo(
    () => trend.flatMap((m) => [
      { month: m.label, type: "Collected", value: m.collected },
      { month: m.label, type: "Invoiced", value: m.invoiced },
    ]),
    [trend],
  );

  const collected = kpi?.total_received ?? 0;
  const overdue = kpi?.overdue_amount ?? 0;
  const outstanding = Math.max(0, (kpi?.total_receivable ?? 0) - overdue);

  if (isLoading) {
    return (
      <DashboardShell>
        <DashboardPageSkeleton />
      </DashboardShell>
    );
  }

  if (error || !kpi) {
    return (
      <DashboardShell>
        <Alert type="error" message="Failed to load finance dashboard" showIcon />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardHeader
        title="Finance Command Center"
        subtitle="Receivables, collections, and cash flow — last 12 months"
        actions={<QuickActionBar actions={quickActions} />}
      />

      <AttentionQueue
        items={attentionItems}
        onItemClick={(item) => item.path && navigate(item.path)}
        emptyMessage="Receivables are healthy — no collection issues flagged."
      />

      <div className="dash-metrics">
        <ActionMetric
          label="Outstanding AR"
          value={fmt(kpi.total_receivable)}
          sub={`${kpi.overdue_count} overdue invoice${kpi.overdue_count !== 1 ? "s" : ""}`}
          accent={kpi.overdue_count > 0 ? "danger" : "primary"}
          icon={<DollarOutlined />}
          actions={[{ label: "Receivable summary", onClick: () => navigate("/payment/receivables") }]}
        />
        <ActionMetric
          label="Collected"
          value={fmt(kpi.total_received)}
          sub={`${kpi.collection_pct.toFixed(1)}% of invoiced`}
          accent={kpi.collection_pct >= 80 ? "success" : "warning"}
          icon={<CheckCircleOutlined />}
          progress={Math.min(100, Math.round(kpi.collection_pct))}
          actions={[{ label: "Payments", onClick: () => navigate("/payment/payments") }]}
        />
        <ActionMetric
          label="Total invoiced"
          value={fmt(kpi.total_invoiced)}
          sub={`${kpi.partial_count} partial collection${kpi.partial_count !== 1 ? "s" : ""}`}
          accent="purple"
          icon={<FileTextOutlined />}
          actions={[{ label: "Invoices", onClick: () => navigate("/payment/invoices") }]}
        />
        <ActionMetric
          label="Overdue"
          value={fmt(kpi.overdue_amount)}
          sub={kpi.overdue_count > 0 ? "Requires follow-up" : "None overdue"}
          accent={kpi.overdue_amount > 0 ? "danger" : "success"}
          icon={<ExclamationCircleOutlined />}
        />
      </div>

      <DashboardGrid
        primary={
          <DashboardPanel title="Invoice vs collection (12 months)">
            <TrendPanel>
              {trendData.length > 0 ? (
                <Column
                  data={trendData}
                  xField="month"
                  yField="value"
                  seriesField="type"
                  isGroup
                  color={chartColors}
                  xAxis={{ label: { autoHide: true, autoRotate: false, style: { fill: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 12 } } }}
                  yAxis={{ label: { formatter: (v: string) => fmt(Number(v)), style: { fill: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' } } }}
                  legend={{ position: "top-right" }}
                  height={280}
                  columnWidthRatio={0.45}
                  theme={isDark ? 'dark' : 'light'}
                />
              ) : (
                <div style={{ minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Text type="secondary">No billing data yet — invoices and payments will appear here</Text>
                </div>
              )}
            </TrendPanel>
          </DashboardPanel>
        }
        secondary={
          <DashboardPanel title="Receivable mix">
            <HealthRing
              centerLabel="Invoiced"
              centerValue={fmt(kpi.total_invoiced)}
              segments={[
                { key: "on_track", label: "Collected", value: collected, color: "#059669" },
                { key: "at_risk", label: "Outstanding", value: outstanding, color: "#6366f1" },
                { key: "delayed", label: "Overdue", value: overdue, color: "var(--pmt-danger-accent)" },
              ]}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Collection rate</Text>
                <Text strong style={{ fontSize: 12 }}>{kpi.collection_pct.toFixed(1)}%</Text>
              </div>
              <Progress
                percent={Math.min(100, Math.round(kpi.collection_pct))}
                strokeColor={
                  kpi.collection_pct >= 80 ? "var(--pmt-success)"
                    : kpi.collection_pct >= 50 ? "var(--pmt-warning)"
                      : "var(--pmt-danger)"
                }
                showInfo={false}
                size="small"
              />
            </div>
          </DashboardPanel>
        }
      />

      <div className="exec-dash-section">
        <DashboardPanel
          title="Receivables overview"
          flush
          extra={
            <Button
              type="link"
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate(
                receivableTab === "project"
                  ? "/payment/receivables?tab=project"
                  : "/payment/receivables",
              )}
            >
              Full summary
            </Button>
          }
        >
          <Tabs
            activeKey={receivableTab}
            onChange={(key) => setReceivableTab(key as "client" | "project")}
            size="small"
            style={{ padding: "0 12px" }}
            tabBarExtraContent={
              <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
                {receivableTab === "client"
                  ? `${clients.length} client${clients.length !== 1 ? "s" : ""}`
                  : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
              </Text>
            }
            items={[
              {
                key: "client",
                label: "Client-wise",
                children: (
                  <Table
                    rowKey="client_id"
                    columns={clientColumns}
                    dataSource={clientRows}
                    size="small"
                    pagination={clientRows.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
                    onRow={() => ({ onClick: () => navigate("/payment/receivables"), style: { cursor: "pointer" } })}
                    locale={{ emptyText: "No client receivables yet" }}
                  />
                ),
              },
              {
                key: "project",
                label: "Project-wise",
                children: (
                  <Table
                    rowKey="project_id"
                    columns={projectColumns}
                    dataSource={projectRows}
                    size="small"
                    pagination={projectRows.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
                    onRow={() => ({ onClick: () => navigate("/payment/receivables?tab=project"), style: { cursor: "pointer" } })}
                    locale={{ emptyText: "No project receivables yet" }}
                  />
                ),
              },
            ]}
          />
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
