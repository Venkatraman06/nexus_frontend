import { useState } from "react";
import { Modal, Form, DatePicker, Input, Switch, Button, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { offboardingApi } from "@/services/offboarding";

export default function ResignationModal({
  open, onClose, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const record = await offboardingApi.create({
        resignation_date: dayjs().format("YYYY-MM-DD"),
        reason: values.reason_for_leaving || "",
      });
      await offboardingApi.savePreference(record.id, {
        preferred_last_working_day: values.preferred_last_working_day
          ? values.preferred_last_working_day.format("YYYY-MM-DD")
          : null,
        reason_for_leaving: values.reason_for_leaving || "",
        will_serve_notice_period: values.will_serve_notice_period ?? true,
        feedback: values.feedback || "",
      });
      return record;
    },
    onSuccess: () => {
      message.success("Resignation submitted — HR has been notified");
      form.resetFields();
      onSuccess();
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail || "Failed to submit resignation";
      message.error(detail);
    },
  });

  return (
    <Modal
      title="Submit Resignation"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={null}
      width={480}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 12 }}
        initialValues={{ will_serve_notice_period: true }}
        onFinish={(v) => mutation.mutate(v)}
      >
        <Form.Item
          name="preferred_last_working_day"
          label="Preferred Last Working Day"
          rules={[{ required: true, message: "Please select a date" }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD MMM YYYY"
            disabledDate={(d) => d && d < dayjs().startOf("day")} />
        </Form.Item>

        <Form.Item
          name="reason_for_leaving"
          label="Reason for Leaving"
          rules={[{ required: true, message: "Please provide a reason" }]}
        >
          <Input.TextArea rows={3} placeholder="Please share your reason for resigning" />
        </Form.Item>

        <Form.Item
          name="will_serve_notice_period"
          label="I will serve my full notice period"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item name="feedback" label="Feedback (optional)">
          <Input.TextArea rows={3} placeholder="Any feedback for the company?" />
        </Form.Item>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" danger htmlType="submit" loading={mutation.isPending}>
            Submit Resignation
          </Button>
        </div>
      </Form>
    </Modal>
  );
}