import { useState } from "react";
import { Typography, Tabs, Space } from "antd";
import { LogoutOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function PreferenceTab() {
  return <div>Preference — coming soon</div>;
}

function ClearanceTab() {
  return <div>Clearance — coming soon</div>;
}

function ExitInterviewTab() {
  return <div>Exit Interview — coming soon</div>;
}

function DocumentsTab() {
  return <div>Documents — coming soon</div>;
}

function WorkflowTab() {
  return <div>Workflow — coming soon</div>;
}

export default function OffboardingPage() {
  const [activeTab, setActiveTab] = useState("preference");

  const items = [
    { key: "preference", label: "Preference", children: <PreferenceTab /> },
    { key: "clearance", label: "Clearance", children: <ClearanceTab /> },
    { key: "exit-interview", label: "Exit Interview", children: <ExitInterviewTab /> },
    { key: "documents", label: "Documents", children: <DocumentsTab /> },
    { key: "workflow", label: "Workflow", children: <WorkflowTab /> },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Space align="center">
          <LogoutOutlined style={{ fontSize: 24, color: "#1677ff" }} />
          <Title level={3} style={{ margin: 0, color: "var(--bms-text)" }}>
            Offboarding
          </Title>
        </Space>
        <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
          Manage employee offboarding — preferences, clearance, exit interviews, documents, and workflow.
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        destroyInactiveTabPane
      />
    </div>
  );
}