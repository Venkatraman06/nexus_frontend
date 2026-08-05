import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Progress, Typography } from "antd";
import { Column } from "@ant-design/charts";
import {
  FileTextOutlined, DollarOutlined, WarningOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined,
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
  WorkQueue,
  TrendPanel,
  DashboardPageSkeleton,
  type AttentionItem,
  type QuickAction,
} from "@/components/dashboard";
import { paymentReportsApi, type ClientReceivable, type MonthlyTrend } from "@/services/payment";

const { Text } = Typography;

function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

export default function PaymentDashboardPage() {
  const navigate = useNavigate();

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

  const kpi = data?.kpi;
  const trend: MonthlyTrend[] = data?.monthly_trend ?? [];
  const clients: ClientReceivable[] = clientData?.results ?? [];

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

  const clientQueue = useMemo(() => {
    return [...clients]
      .sort((a, b) => b.overdue_amount - a.overdue_amount || b.total_pending - a.total_pending)
      .slice(0, 8)
      .map((c) => ({
        id: c.client_id,
        title: c.client_name,
        subtitle: `${c.invoice_count} invoice${c.invoice_count !== 1 ? "s" : ""}`,
        badge: {
          label: c.overdue_amount > 0 ? "Overdue" : "Pending",
          color: c.overdue_amount > 0 ? "error" : "warning",
        },
        meta: `${fmt(c.total_pending)} pending · ${c.collection_pct.toFixed(0)}% collected`,
        metaColor: c.overdue_amount > 0 ? "var(--bms-danger)" : undefined,
        onClick: () => navigate("/payment/receivables"),
      }));
  }, [clients, navigate]);

  const quickActions = useMemo((): QuickAction[] => [
    { key: "invoices", label: "Invoices", icon: <FileTextOutlined />, onClick: () => navigate("/payment/invoices"), primary: true },
    { key: "payments", label: "Record payment", icon: <DollarOutlined />, onClick: () => navigate("/payment/payments") },
    { key: "receivables", label: "Receivable summary", icon: <WarningOutlined />, onClick: () => navigate("/payment/receivables") },
    { key: "milestones", label: "Milestones", icon: <CheckCircleOutlined />, onClick: () => navigate("/payment/milestones") },
  ], [navigate]);

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
                  color={["#16a34a", "#6366f1"]}
                  yAxis={{ label: { formatter: (v: string) => fmt(Number(v)) } }}
                  legend={{ position: "top-right" }}
                  height={260}
                  columnWidthRatio={0.45}
                />
              ) : (
                <Text type="secondary">No billing data yet</Text>
              )}
            </TrendPanel>
          </DashboardPanel>
        }
        secondary={
          <div className="dash-stack">
            <DashboardPanel title="Receivable mix">
              <HealthRing
                centerLabel="Invoiced"
                centerValue={fmt(kpi.total_invoiced)}
                segments={[
                  { key: "on_track", label: "Collected", value: collected, color: "#16a34a" },
                  { key: "at_risk", label: "Outstanding", value: outstanding, color: "#6366f1" },
                  { key: "delayed", label: "Overdue", value: overdue, color: "#dc2626" },
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
                    kpi.collection_pct >= 80 ? "var(--bms-success)"
                      : kpi.collection_pct >= 50 ? "var(--bms-warning)"
                        : "var(--bms-danger)"
                  }
                  showInfo={false}
                  size="small"
                />
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Top receivables by client"
              extra={clients.length > 0 ? <Text type="secondary" style={{ fontSize: 12 }}>{clients.length} clients</Text> : undefined}
            >
              <WorkQueue
                items={clientQueue}
                emptyTitle="No receivables"
                emptyDescription="Client outstanding balances appear here."
                emptyAction={
                  <button type="button" className="dash-quick-btn" onClick={() => navigate("/payment/invoices")}>
                    View invoices
                  </button>
                }
              />
            </DashboardPanel>
          </div>
        }
      />
    </DashboardShell>
  );
}
