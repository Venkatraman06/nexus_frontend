import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table, Typography, Tag, Space, Button, Modal, Form,
  Input, Select, DatePicker, Upload, Spin, Empty, message,
  Popconfirm, Tooltip, Badge, Row, Col,
} from "antd";
import {
  PlusOutlined, UploadOutlined, DownloadOutlined,
  DeleteOutlined, CheckCircleOutlined, FileTextOutlined,
  SafetyCertificateOutlined, EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { UploadFile } from "antd";

import { hrComplianceApi, DOCUMENT_TYPE_OPTIONS, type HRComplianceDocument } from "@/services/compliance";
import { employeeApi } from "@/services/employees";
import { useAuthStore } from "@/store/auth";
import { PERMS } from "@/constants/permissions";
import PermGuard from "@/components/common/PermGuard";
import { usePermission } from "@/hooks/usePermission";
import { apiErrorMsg } from "@/utils/apiError";

const { Title, Text } = Typography;
const { TextArea } = Input;

const DOC_TYPE_COLOR: Record<string, string> = {
  NDA: "red", UNDERTAKING: "blue", OFFER: "green", POLICY: "purple", OTHER: "default",
};

export default function HRCompliancePage() {
  const isHR = usePermission(PERMS.HRMS_COMPLIANCE_CREATE);

  const [uploadOpen, setUploadOpen]     = useState(false);
  const [selectedEmp, setSelectedEmp]   = useState<string | undefined>(undefined);
  const [fileList, setFileList]         = useState<UploadFile[]>([]);
  const [form]                          = Form.useForm();
  const qc                              = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-dropdown"],
    queryFn: () => employeeApi.list().then((r: any) => r.results ?? r),
    enabled: isHR,
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["hr-compliance", selectedEmp],
    queryFn: () => hrComplianceApi.list(selectedEmp ? { employee: selectedEmp } : {}),
  });

  const uploadMut = useMutation({
    mutationFn: (fd: FormData) => hrComplianceApi.create(fd),
    onSuccess: () => {
      message.success("Compliance document uploaded");
      qc.invalidateQueries({ queryKey: ["hr-compliance"] });
      setUploadOpen(false);
      setFileList([]);
      form.resetFields();
    },
    onError: (e) => message.error(apiErrorMsg(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => hrComplianceApi.delete(id),
    onSuccess: () => {
      message.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["hr-compliance"] });
    },
    onError: (e) => message.error(apiErrorMsg(e)),
  });

  const ackMut = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      hrComplianceApi.acknowledge(id, date),
    onSuccess: () => {
      message.success("Acknowledged");
      qc.invalidateQueries({ queryKey: ["hr-compliance"] });
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
      fd.append("employee", values.employee);
      fd.append("document_type", values.document_type);
      fd.append("title", values.title);
      fd.append("description", values.description ?? "");
      fd.append("version", values.version ?? "");
      if (values.effective_date) {
        fd.append("effective_date", values.effective_date.format("YYYY-MM-DD"));
      }
      fd.append("file", fileList[0].originFileObj);
      uploadMut.mutate(fd);
    } catch {
      /* antd validation */
    }
  };

  const columns = [
    {
      title: "Document",
      key: "doc",
      render: (_: any, row: HRComplianceDocument) => (
        <Space>
          <FileTextOutlined style={{ color: "#1677ff", fontSize: 18 }} />
          <div>
            <Text strong style={{ fontSize: 13, color: "var(--bms-text)" }}>{row.title}</Text>
            {row.version && (
              // ✅ FIX: Text type="secondary" inherits correctly, but explicit for clarity
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>v{row.version}</Text>
            )}
          </div>
        </Space>
      ),
    },
    ...(isHR ? [{
      title: "Employee",
      dataIndex: "employee_name",
      key: "employee_name",
      render: (name: string) => <Text style={{ color: "var(--bms-text)" }}>{name}</Text>,
    }] : []),
    {
      title: "Type",
      dataIndex: "document_type",
      key: "document_type",
      render: (t: string, row: HRComplianceDocument) => (
        <Tag color={DOC_TYPE_COLOR[t] ?? "default"}>{row.document_type_display}</Tag>
      ),
    },
    {
      title: "Effective Date",
      dataIndex: "effective_date",
      key: "effective_date",
      render: (d: string | null) => (
        // ✅ FIX: explicit color so date text isn't stuck on light value
        <Text style={{ fontSize: 13, color: "var(--bms-text)" }}>
          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, row: HRComplianceDocument) =>
        row.is_acknowledged ? (
          <Badge status="success" text={
            <Text style={{ fontSize: 12, color: "var(--bms-text)" }}>
              Acknowledged {row.acknowledged_date ? dayjs(row.acknowledged_date).format("DD MMM YYYY") : ""}
            </Text>
          } />
        ) : (
          <Badge status="warning" text={<Text style={{ fontSize: 12, color: "#faad14" }}>Pending</Text>} />
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, row: HRComplianceDocument) => (
        <Space>
          {row.file_url && (
            <Tooltip title="Download">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => window.open(row.file_url!, "_blank")}
              />
            </Tooltip>
          )}
          {!row.is_acknowledged && !isHR && (
            <Tooltip title="Mark as Acknowledged (received hard copy)">
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                type="primary"
                ghost
                loading={ackMut.isPending}
                onClick={() =>
                  ackMut.mutate({ id: row.id, date: dayjs().format("YYYY-MM-DD") })
                }
              >
                Acknowledge
              </Button>
            </Tooltip>
          )}
          <PermGuard permission={PERMS.HRMS_COMPLIANCE_CREATE}>
            <Popconfirm
              title="Delete this compliance document?"
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
            <SafetyCertificateOutlined style={{ fontSize: 24, color: "#1677ff" }} />
            {/* ✅ FIX: was no color — Title defaults to light theme text */}
            <Title level={4} style={{ margin: 0, color: "var(--bms-text)" }}>HR Compliance Documents</Title>
          </Space>
          {/* ✅ FIX: Text type="secondary" is fine here — antd handles it via ConfigProvider */}
          <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
            {isHR
              ? "Upload and manage compliance documents for employees."
              : "View and acknowledge your compliance documents assigned by HR."}
          </Text>
        </div>
        <PermGuard permission={PERMS.HRMS_COMPLIANCE_CREATE}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Document
          </Button>
        </PermGuard>
      </div>

      {/* Filters (HR only) */}
      {isHR && (
        <div style={{
          // ✅ FIX: was background: "#fff", border: "1px solid #e8edf3"
          background: "var(--bms-surface)",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 16,
          border: "1px solid var(--bms-border)",
        }}>
          <Row gutter={16} align="middle">
            <Col>
              {/* ✅ FIX: was no color set */}
              <Text strong style={{ fontSize: 13, color: "var(--bms-text)" }}>Filter by Employee:</Text>
            </Col>
            <Col flex={1} style={{ maxWidth: 320 }}>
              <Select
                placeholder="All employees"
                allowClear
                showSearch
                style={{ width: "100%" }}
                optionFilterProp="label"
                value={selectedEmp}
                onChange={setSelectedEmp}
                options={employees.map((e: any) => ({
                  value: e.id,
                  label: `${e.full_name} (${e.employee_code || e.username})`,
                }))}
              />
            </Col>
          </Row>
        </div>
      )}

      {/* Table */}
      <div style={{
        // ✅ FIX: was background: "#fff", border: "1px solid #e8edf3"
        background: "var(--bms-surface)",
        borderRadius: 10,
        border: "1px solid var(--bms-border)",
        overflow: "hidden",
      }}>
        <Table
          dataSource={docs}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} document${t !== 1 ? "s" : ""}` }}
          locale={{ emptyText: <Empty description="No compliance documents" /> }}
        />
      </div>

      {/* Upload Modal */}
      <Modal
        title={
          <Space>
            <UploadOutlined />
            <span>Upload Compliance Document</span>
          </Space>
        }
        open={uploadOpen}
        onCancel={() => { setUploadOpen(false); setFileList([]); form.resetFields(); }}
        onOk={handleUpload}
        okText="Upload"
        confirmLoading={uploadMut.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="employee"
            label="Employee"
            rules={[{ required: true, message: "Select an employee" }]}
          >
            <Select
              showSearch
              placeholder="Select employee"
              optionFilterProp="label"
              options={employees.map((e: any) => ({
                value: e.id,
                label: `${e.full_name} (${e.employee_code || e.username})`,
              }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="document_type"
                label="Document Type"
                rules={[{ required: true, message: "Select document type" }]}
              >
                <Select placeholder="Type" options={DOCUMENT_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="version" label="Version">
                <Input placeholder="e.g. 1.0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="title"
            label="Document Title"
            rules={[{ required: true, message: "Enter document title" }]}
          >
            <Input placeholder="e.g. Non-Disclosure Agreement 2026" />
          </Form.Item>

          <Form.Item name="effective_date" label="Effective Date">
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
          </Form.Item>

          <Form.Item name="description" label="Description / Notes">
            <TextArea rows={3} placeholder="Optional notes for the employee..." />
          </Form.Item>

          <Form.Item label="PDF File" rules={[{ required: true }]}>
            <Upload
              accept=".pdf"
              maxCount={1}
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
            >
              <Button icon={<UploadOutlined />}>Choose PDF</Button>
            </Upload>
            {/* ✅ FIX: Text type="secondary" is fine — antd ConfigProvider handles dark mode */}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Only PDF files accepted. Employee can download and sign the hard copy.
            </Text>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}