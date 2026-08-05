import { useQuery } from "@tanstack/react-query";
import {
  Table, Button, Tag, Typography, Card, Row, Col, Space, Tooltip,
} from "antd";
import { PlusOutlined, EyeOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { rolesApi } from "@/services/roles";
import PermGuard from "@/components/common/PermGuard";
import { PERMS } from "@/constants/permissions";

const { Title, Text } = Typography;

export default function RoleManagementPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesApi.list(),
  });

  const roles = data?.results ?? [];

  const columns = [
    {
      title: "Role Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name),
      render: (name: string, record: { id: string }) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 600 }}
          onClick={() => navigate(`/settings/roles/${record.id}`)}
        >
          {name}
        </Button>
      ),
    },
    {
      title: "Users Assigned",
      dataIndex: "users_assigned",
      key: "users_assigned",
      width: 140,
      align: "center" as const,
      render: (n: number) => (
        <Space size={4}>
          <TeamOutlined style={{ color: "#8c9ab0" }} />
          <Text>{n}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: () => (
        <Tag color="success" style={{ borderRadius: 12, fontWeight: 600 }}>Active</Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      render: (_: unknown, record: { id: string }) => (
        <Tooltip title="View / manage permissions">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/settings/roles/${record.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Role Management</Title>
          <Text type="secondary">
            Roles map to Keycloak groups. Permissions are assigned per role.
          </Text>
        </Col>
        <Col>
          <PermGuard permission={PERMS.ROLE_PERMISSION_ASSIGN}>
            <Button type="primary" icon={<PlusOutlined />} disabled title="Create roles in Keycloak Admin">
              Create New Role
            </Button>
          </PermGuard>
        </Col>
      </Row>

      <Card title={`Role List (${roles.length})`}>
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showTotal: (t, r) => `Showing ${r[0]}-${r[1]} of ${t}` }}
          size="middle"
        />
      </Card>
    </div>
  );
}
