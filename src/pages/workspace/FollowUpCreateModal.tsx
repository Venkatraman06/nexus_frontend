import { useEffect } from "react";
import {
  Modal, Form, Input, Select, DatePicker, Row, Col, Divider, Typography, message, Tooltip,
} from "antd";
import {
  PhoneOutlined, MailOutlined, CalendarOutlined, WhatsAppOutlined, EnvironmentOutlined,
  VideoCameraOutlined, TeamOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { followUpApi, type FollowUpCreate, type FollowUpItem, FOLLOWUP_PRIORITIES } from "@/services/followups";
import { get } from "@/services/api";
import { ENDPOINTS } from "@/constants/api";
import { useAuthStore } from "@/store/auth";
import { isTimeWindowInvalid } from "@/pages/workspace/workspaceDateRules";
import AssigneeAvatar from "@/components/common/AssigneeAvatar";
import GoogleColorPicker from "@/components/common/GoogleColorPicker";
import { extractCustomColor } from "./workspaceCalendarTheme";
import ClockTimePicker from "@/components/common/ClockTimePicker";

const { TextArea } = Input;
const { Text } = Typography;

const TYPE_OPTIONS = [
  { value: "EMAIL", label: "Email", icon: <MailOutlined /> },
  { value: "CALL", label: "Call", icon: <PhoneOutlined /> },
  { value: "MEETING", label: "Meeting", icon: <CalendarOutlined /> },
  { value: "WHATSAPP", label: "WhatsApp", icon: <WhatsAppOutlined /> },
  { value: "SITE_VISIT", label: "Site Visit", icon: <EnvironmentOutlined /> },
];

const MEETING_MODE_OPTIONS = [
  {
    value: "ONLINE",
    label: "Online",
    icon: <VideoCameraOutlined />,
    color: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.1)",
    border: "#3B82F6",
  },
  {
    value: "OFFLINE",
    label: "Offline",
    icon: <TeamOutlined />,
    color: "#0D9488",
    bg: "rgba(13, 148, 136, 0.1)",
    border: "#0D9488",
  },
];

function PriorityPicker({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
      {FOLLOWUP_PRIORITIES.map((p) => {
        const active = (value ?? "MEDIUM") === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange?.(p.value)}
            style={{
              padding: "8px 4px", borderRadius: 8,
              border: `2px solid ${active ? p.border : "var(--pmt-border)"}`,
              background: active ? p.bg : "var(--pmt-surface)",
              color: active ? p.text : "var(--pmt-text-2)",
              fontWeight: active ? 700 : 500, fontSize: 12, cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function MeetingModePicker({ value, onChange }: { value?: string | null; onChange?: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {MEETING_MODE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange?.(opt.value)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              border: `2px solid ${active ? opt.border : "var(--pmt-border)"}`,
              background: active ? opt.bg : "var(--pmt-surface)",
              color: active ? opt.color : "var(--pmt-text-2)",
              fontWeight: active ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: 16 }}>{opt.icon}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function FollowUpCreateModal({
  open,
  dueDate,
  onClose,
  onCreated,
  editItem,
  defaultType,
}: {
  open: boolean;
  dueDate?: string | null;
  onClose: () => void;
  onCreated?: () => void;
  editItem?: FollowUpItem | null;
  /** Lock the type field to this value (e.g. "MEETING" when scheduling from the Meetings page) */
  defaultType?: string;
}) {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const selectedType = Form.useWatch("type", form);

  const isEditing = Boolean(editItem);

  const { data: employees } = useQuery({
    queryKey: ["employees-dropdown"],
    queryFn: () => get<Array<{ id: string; full_name: string }>>(ENDPOINTS.EMPLOYEES_DROPDOWN),
    staleTime: 60_000,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (editItem) {
      const { color, cleanText } = extractCustomColor(editItem.comments);
      form.setFieldsValue({
        title: editItem.title,
        type: editItem.type,
        priority: editItem.priority || "MEDIUM",
        description: editItem.description,
        content: editItem.content,
        comments: cleanText,
        color: color,
        assignees: editItem.assignees || [],
        date_range: [
          editItem.start_date ? dayjs(editItem.start_date) : null,
          editItem.end_date ? dayjs(editItem.end_date) : null,
        ],
        start_time: editItem.start_time ? dayjs(`2000-01-01T${editItem.start_time}`) : null,
        end_time: editItem.end_time ? dayjs(`2000-01-01T${editItem.end_time}`) : null,
        meeting_mode: editItem.meeting_mode || null,
      });
    } else {
      const initialType = defaultType || "CALL";
      form.setFieldsValue({
        type: initialType,
        priority: "MEDIUM",
        date_range: dueDate ? [dayjs(dueDate), dayjs(dueDate)] : [null, null],
        assignees: userId ? [userId] : [],
        color: null,
      });
    }
  }, [open, dueDate, editItem, userId, form]);

  const createMutation = useMutation({
    mutationFn: (data: FollowUpCreate) => followUpApi.create(data),
    onSuccess: () => {
      message.success("Follow-up scheduled");
      form.resetFields();
      qc.invalidateQueries({ queryKey: ["workspace-calendar"] });
      qc.invalidateQueries({ queryKey: ["followups-board"] });
      qc.invalidateQueries({ queryKey: ["followups-list"] });
      qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
      onCreated?.();
      onClose();
    },
    onError: (error: any) => {
      console.error(error?.response?.data);
      const msg = error?.response?.data ? JSON.stringify(error.response.data) : "Failed to schedule follow-up";
      message.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FollowUpCreate> }) => followUpApi.update(id, data),
    onSuccess: () => {
      message.success("Follow-up updated");
      form.resetFields();
      qc.invalidateQueries({ queryKey: ["workspace-calendar"] });
      qc.invalidateQueries({ queryKey: ["followups-board"] });
      qc.invalidateQueries({ queryKey: ["followups-list"] });
      qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
      onCreated?.();
      onClose();
    },
    onError: () => message.error("Failed to update follow-up"),
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const [startDate, endDate] = values.date_range ?? [null, null];
      const startTimeStr = values.start_time ? values.start_time.format("HH:mm:ss") : null;
      const endTimeStr = values.end_time ? values.end_time.format("HH:mm:ss") : null;
      const [sDate, eDate] = values.date_range ?? [null, null];

      // Check if time window is invalid (end datetime before start datetime)
      if (isTimeWindowInvalid(startTimeStr, endTimeStr, sDate, eDate)) {
        message.error("End must be after start.");
        return;
      }

      const assignees = values.assignees && values.assignees.length > 0 ? values.assignees : [];
      
      let finalComments = values.comments || "";
      if (values.color) {
        finalComments += ` <!--color:${values.color}-->`;
      }

      const payload: FollowUpCreate = {
        title: values.title,
        type: values.type,
        priority: values.priority || "MEDIUM",
        description: values.description || "",
        content: editItem?.content || "",
        comments: finalComments,
        assignees,
        start_date: startDate ? startDate.format("YYYY-MM-DD") : null,
        end_date: endDate ? endDate.format("YYYY-MM-DD") : null,
        start_time: startTimeStr,
        end_time: endTimeStr,
        meeting_mode: values.type === "MEETING" ? (values.meeting_mode || null) : null,
      };
      if (isEditing && editItem) {
        updateMutation.mutate({ id: editItem.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  };

  const typeLabel = TYPE_OPTIONS.find((t) => t.value === selectedType)?.label || "Follow-up";

  return (
    <Modal
      title={editItem ? `Edit ${typeLabel}` : (dueDate ? `Schedule ${typeLabel} · ${dayjs(dueDate).format("ddd, DD MMM YYYY")}` : `Schedule ${typeLabel}`)}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleSubmit}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      okText={editItem ? "Save changes" : `Schedule ${typeLabel.toLowerCase()}`}
      width={600}
      centered
      destroyOnClose
      styles={{
        content: { maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" },
        body: { paddingTop: 8, overflowY: "auto", flex: "1 1 auto" },
      }}
    >
      <Form form={form} layout="vertical" requiredMark="optional" initialValues={{ type: defaultType || "CALL", priority: "MEDIUM", color: "#98b7e2" }}>
        <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
          <Input placeholder="e.g. Client call — project scope review" size="large" />
        </Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true }]} style={defaultType ? { display: 'none' } : undefined}>
          <Select
            size="large"
            disabled={Boolean(defaultType)}
            options={TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
            optionRender={(opt) => (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {TYPE_OPTIONS.find((t) => t.value === opt.value)?.icon}
                {opt.label}
              </span>
            )}
          />
        </Form.Item>
        <Form.Item
          name="date_range"
          label="Date range"
          rules={[{
            validator(_, value) {
              const [start, end] = value ?? [null, null];
              if (start && end && end.isBefore(start, "day")) {
                return Promise.reject(new Error("End date must be after start date"));
              }
              return Promise.resolve();
            },
          }]}
        >
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            size="large"
            format="DD MMM YYYY"
            placeholder={["Start date", "End date"]}
            disabledDate={(current) => current && current.isBefore(dayjs(), "day")}
          />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="start_time" label="Start time">
              <ClockTimePicker />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="end_time"
              label="End time"
              dependencies={["start_time", "date_range"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, end) {
                    const start = getFieldValue("start_time");
                    const [sDate, eDate] = getFieldValue("date_range") ?? [null, null];
                    if (start && end) {
                      // When both dates are set, compare combined Date+Time objects.
                      // Extract only hour/minute from the TimePicker (discard its "today" date).
                      if (sDate && eDate) {
                        const sDt = sDate.hour(start.hour()).minute(start.minute()).second(0);
                        const eDt = eDate.hour(end.hour()).minute(end.minute()).second(0);
                        if (eDt.isAfter(sDt)) return Promise.resolve();
                        return Promise.reject(new Error("End must be after start"));
                      }
                      // Fallback: no dates — compare times alone
                      if (!end.isAfter(start)) return Promise.reject(new Error("End must be after start"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <ClockTimePicker />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
          <PriorityPicker />
        </Form.Item>

        {selectedType === "MEETING" && (
          <Form.Item
            name="meeting_mode"
            label="Meeting Mode"
            style={{ marginBottom: 16 }}
          >
            <MeetingModePicker />
          </Form.Item>
        )}
        <Form.Item name="assignees" label="Assignees">
          <Select
            mode="multiple"
            allowClear
            showSearch
            placeholder="Select assignees"
            size="large"
            optionFilterProp="label"
            options={(employees ?? []).map((e) => ({ value: e.id, label: e.full_name }))}
            tagRender={({ label }) => {
              const name = String(label);
              return (
                <Tooltip title={name}>
                  <span style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
                    <AssigneeAvatar name={name} size={24} />
                  </span>
                </Tooltip>
              );
            }}
          />
        </Form.Item>
        <Divider style={{ margin: "4px 0 16px" }} />
        <Form.Item name="description" label="Description" rules={[{ required: true, message: "Description is required" }]}>
          <TextArea rows={3} placeholder="What needs to be done?" showCount maxLength={500} />
        </Form.Item>

        <Form.Item name="color" label="Event Color" style={{ marginBottom: 0 }}>
          <GoogleColorPicker />
        </Form.Item>
      </Form>
    </Modal>
  );
}
