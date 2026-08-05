import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Typography, Tag, Space, Button, Modal, Form,
  Input, DatePicker, Upload, Empty, message,
  Popconfirm, Tooltip, Switch, Row, Col, Card, Statistic,
} from "antd";
import {
  PlusOutlined, UploadOutlined, DownloadOutlined,
  DeleteOutlined, FileProtectOutlined, EyeOutlined,
  StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { UploadFile } from "antd";

import { policyApi, type PolicyDocument } from "@/services/compliance";
import { PERMS } from "@/constants/permissions";
import PermGuard from "@/components/common/PermGuard";
import { usePermission } from "@/hooks/usePermission";
import { apiErrorMsg } from "@/utils/apiError";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function PolicyDocumentsPage() {
  const canUpload = usePermission(PERMS.POLICY_CREATE);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList]     = useState<UploadFile[]>([]);
  const [form]                      = Form.useForm();
  const qc                          = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policy-documents"],
    queryFn: () => policyApi.list(),
  });

  const uploadMut = useMutation({
    mutationFn: (fd: FormData) => policyApi.create(fd),
    onSuccess: () => {
      message.success("Policy document uploaded");
      qc.invalidateQueries({ queryKey: ["policy-documents"] });
      setUploadOpen(false);
      setFileList([]);
      form.resetFields();
    },
    onError: (e) => message.error(apiErrorMsg(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => policyApi.delete(id),
    onSuccess: () => {
      message.success("Policy deleted");
      qc.invalidateQueries({ queryKey: ["policy-documents"] });
    },
    onError: (e) => message.error(apiErrorMsg(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      policyApi.togglePublish(id, published),
    onSuccess: () => {
      message.success("Policy updated");
      qc.invalidateQueries({ queryKey: ["policy-documents"] });
    },
    onError: (e) => message.error(apiErrorMsg(e)),
  });

  const handleUpload = async () => {
    try {
      const values = await form.validateFields();
      if (!fileList[0]?.originFileObj) {
        message.error("Please select a PDF file");
        return;
      }
      const fd = new FormData();
      fd.append("title", values.title);
      fd.append("version", values.version ?? "");
      fd.append("description", values.description ?? "");
      if (values.effective_date) {
        fd.append("effective_date", values.effective_date.format("YYYY-MM-DD"));
      }
      fd.append("is_published", "true");
      fd.append("file", fileList[0].originFileObj);
      uploadMut.mutate(fd);
    } catch {
      /* antd validation */
    }
  };

  const published = policies.filter((p) => p.is_published);
  const unpublished = policies.filter((p) => !p.is_published);

  const columns = [
    {
      title: "Policy Document",
      key: "title",
      render: (_: any, row: PolicyDocument) => (
        <Space>
          <FileProtectOutlined style={{ color: "#1677ff", fontSize: 18 }} />
          <div>
            <Text strong style={{ fontSize: 13 }}>{row.title}</Text>
            {row.version && (
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                v{row.version} · {row.uploaded_by_name ?? "HR"}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: "Effective Date",
      dataIndex: "effective_date",
      key: "effective_date",
      render: (d: string | null) => d ? dayjs(d).format("DD MMM YYYY") : "—",
    },
    {
      title: "Uploaded On",
      dataIndex: "created_at",
      key: "created_at",
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    ...(canUpload ? [{
      title: "Published",
      key: "published",
      render: (_: any, row: PolicyDocument) => (
        <Switch
          size="small"
          checked={row.is_published}
          loading={toggleMut.isPending}
          onChange={(checked) => toggleMut.mutate({ id: row.id, published: checked })}
        />
      ),
    }] : [{
      title: "Status",
      key: "status",
      render: (_: any, row: PolicyDocument) => (
        <Tag color={row.is_published ? "success" : "default"}>
          {row.is_published ? "Active" : "Inactive"}
        </Tag>
      ),
    }]),
    {
      title: "Actions",
      key: "actions",
      render: (_: any, row: PolicyDocument) => (
        <Space>
          {row.file_url && (
            <Tooltip title="Download PDF">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                type="primary"
                ghost
                onClick={() => window.open(row.file_url!, "_blank")}
              >
                Download
              </Button>
            </Tooltip>
          )}
          <PermGuard permission={PERMS.POLICY_DELETE}>
            <Popconfirm
              title="Delete this policy document?"
              onConfirm={() => deleteMut.mutate(row.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </PermGuard>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 24,
      }}>
        <div>
          <Space align="center">
            <FileProtectOutlined style={{ fontSize: 24, color: "#1677ff" }} />
            <Title level={4} style={{ margin: 0 }}>Policy Documents</Title>
          </Space>
          <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
            {canUpload
              ? "Manage company-wide policy documents. Published policies are visible to all employees."
              : "View and download active company policy documents."}
          </Text>
        </div>
        <PermGuard permission={PERMS.POLICY_CREATE}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Policy
          </Button>
        </PermGuard>
      </div>

      {/* Summary cards (HR only) */}
      {canUpload && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col span={8}>
            <Card style={{ borderRadius: 10, border: "1px solid #e8edf3" }} bodyStyle={{ padding: "16px 20px" }}>
              <Statistic
                title="Total Policies"
                value={policies.length}
                valueStyle={{ color: "#1677ff", fontSize: 28 }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ borderRadius: 10, border: "1px solid #e8edf3" }} bodyStyle={{ padding: "16px 20px" }}>
              <Statistic
                title="Published (Active)"
                value={published.length}
                valueStyle={{ color: "#52c41a", fontSize: 28 }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ borderRadius: 10, border: "1px solid #e8edf3" }} bodyStyle={{ padding: "16px 20px" }}>
              <Statistic
                title="Unpublished"
                value={unpublished.length}
                valueStyle={{ color: "#8c9ab0", fontSize: 28 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Table */}
      <div style={{
        background: "#fff", borderRadius: 10, border: "1px solid #e8edf3", overflow: "hidden",
      }}>
        <Table
          dataSource={policies}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} polic${t !== 1 ? "ies" : "y"}` }}
          locale={{ emptyText: <Empty description="No policy documents yet" /> }}
        />
      </div>

      {/* Upload Modal */}
      <Modal
        title={
          <Space>
            <UploadOutlined />
            <span>Upload New Policy Document</span>
          </Space>
        }
        open={uploadOpen}
        onCancel={() => { setUploadOpen(false); setFileList([]); form.resetFields(); }}
        onOk={handleUpload}
        okText="Upload"
        confirmLoading={uploadMut.isPending}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="Policy Title"
            rules={[{ required: true, message: "Enter policy title" }]}
          >
            <Input placeholder="e.g. Work From Home Policy 2026" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="version" label="Version">
                <Input placeholder="e.g. 2.1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effective_date" label="Effective Date">
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Brief description of this policy..." />
          </Form.Item>

          <Form.Item label="PDF File">
            <Upload
              accept=".pdf"
              maxCount={1}
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
            >
              <Button icon={<UploadOutlined />}>Choose PDF</Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Only PDF files. Employees can download and print.
            </Text>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
