import { Divider, Typography } from "antd";
import ClientReceivableSection from "./receivables/ClientReceivableSection";
import ProjectReceivableSection from "./receivables/ProjectReceivableSection";

const { Title } = Typography;

export default function ReceivableSummaryPage() {
  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Receivable Summary</Title>

      <ClientReceivableSection showTitle={false} />

      <Divider style={{ margin: "32px 0" }} />

      <ProjectReceivableSection showTitle={false} />
    </div>
  );
}
