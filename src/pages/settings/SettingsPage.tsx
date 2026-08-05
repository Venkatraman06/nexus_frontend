import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Typography, Card, Form, Input, Button, Avatar, message,
  Row, Col, Divider, Spin, Modal, Popconfirm,
} from "antd";
import { UserOutlined, CameraOutlined, SaveOutlined, SafetyOutlined } from "@ant-design/icons";
import { get, post } from "@/services/api";
import client from "@/services/api";
import PhoneInput from "@/components/common/PhoneInput";
import { phoneFormRules } from "@/utils/phone";
import { useAuthStore } from "@/store/auth";

const { Title, Text } = Typography;

interface MeProfile {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  employee_code: string;
  designation: string;
  department: string;
  phone_number: string;
  bio: string;
  profile_picture_url: string | null;
  keycloak_group: string;
  joining_date: string | null;
  totp_enabled?: boolean;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [form] = Form.useForm();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [totpModalOpen, setTotpModalOpen] = useState(false);
  const [totpData, setTotpData] = useState<{ secret: string; qr_code: string; totp_enabled: boolean } | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  const { data: me, isLoading } = useQuery<MeProfile>({
    queryKey: ["me"],
    queryFn: () => get("/users/me/"),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (me) {
      form.setFieldsValue({
        first_name:   (me.full_name ?? "").split(" ")[0] ?? "",
        last_name:    (me.full_name ?? "").split(" ").slice(1).join(" ") ?? "",
        phone_number: me.phone_number ?? "",
        bio:          me.bio ?? "",
      });
    }
  }, [me, form]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { message.error("Image must be under 2MB"); return; }
    setPendingFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const fd = new FormData();
      fd.append("first_name",   values.first_name ?? "");
      fd.append("last_name",    values.last_name  ?? "");
      fd.append("phone_number", values.phone_number ?? "");
      fd.append("bio",          values.bio ?? "");
      if (pendingFile) fd.append("profile_picture", pendingFile);

      await client.patch("/users/me/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("Profile updated successfully");
      setPendingFile(null);

      // Re-fetch user details from the backend and update the global Zustand store
      const updatedMe = await get<any>("/users/me/");
      // Bust browser cache on profile picture so both Settings and navbar avatar refresh immediately
      if (updatedMe.profile_picture_url) {
        updatedMe.profile_picture_url = `${updatedMe.profile_picture_url}?t=${Date.now()}`;
      }
      setUser(updatedMe);
      qc.setQueryData(["me"], updatedMe);
    } catch (e: any) {
      // Extract error message from various API response formats
      const data = e?.response?.data;
      const errMsg =
        data?.errors   ??                         // {"status":"error","errors":"..."} (custom exception handler)
        data?.detail   ??                         // {"detail": "..."}
        data?.message  ??                         // {"status":"error","message":"..."} (fallback message)
        (Array.isArray(data) ? data[0] : null) ?? // DRF ValidationError detail as array
        (typeof data === "string" ? data : null) ?? // Plain string response
        "Failed to update profile";
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTotpModal = async () => {
    setTotpLoading(true);
    try {
      const res = await post<any>("/auth/totp/setup/", {});
      setTotpData(res);
      setTotpModalOpen(true);
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to initialize 2FA setup");
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerifyEnableTotp = async () => {
    if (!totpCodeInput.trim()) return;
    setTotpLoading(true);
    try {
      await post<any>("/auth/totp/verify-enable/", { secret: totpData?.secret, otp: totpCodeInput.trim() });
      message.success("Google Authenticator (2FA) enabled successfully!");
      setTotpModalOpen(false);
      setTotpCodeInput("");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Invalid 6-digit code");
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisableTotp = async () => {
    setTotpLoading(true);
    try {
      await post<any>("/auth/totp/disable/", {});
      message.success("Google Authenticator disabled");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Failed to disable 2FA");
    } finally {
      setTotpLoading(false);
    }
  };

  if (isLoading) return <div style={{ textAlign: "center", paddingTop: 80 }}><Spin size="large" /></div>;
  if (!me) return null;

  const avatarSrc = avatarPreview ?? me.profile_picture_url ?? undefined;
  const initials = me.full_name?.slice(0, 2).toUpperCase() || "U";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Settings</Title>
        <Text style={{ color: "#6b7280", fontSize: 13 }}>Update your profile and personal details</Text>
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        {/* Avatar section */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
            <Avatar
              size={88}
              src={avatarSrc}
              icon={!avatarSrc ? <UserOutlined /> : undefined}
              style={{ background: "#1677ff", fontSize: 28, fontWeight: 700 }}
            >
              {!avatarSrc ? initials : undefined}
            </Avatar>
            <div style={{
              position: "absolute", bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: "50%",
              background: "#1677ff", display: "flex", alignItems: "center",
              justifyContent: "center", border: "2px solid #fff",
            }}>
              <CameraOutlined style={{ color: "#fff", fontSize: 12 }} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{me.full_name}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{me.employee_code} · {me.designation || me.keycloak_group}</div>
            {me.department && <div style={{ fontSize: 12, color: "#9ca3af" }}>{me.department}</div>}
            <Text type="secondary" style={{ fontSize: 12 }}>Click avatar to change photo (max 2MB)</Text>
          </div>
        </div>

        <Divider style={{ margin: "0 0 20px" }} />

        {/* Read-only info */}
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {[
            { label: "Email",        value: me.email           },
            { label: "Employee Code",value: me.employee_code   },
            { label: "Designation",  value: me.designation || "—" },
            { label: "Department",   value: me.department  || "—" },
          ].map(({ label, value }) => (
            <Col span={12} key={label}>
              <div style={{
                background: "#f8fafc", borderRadius: 8,
                padding: "10px 14px", marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{value}</div>
              </div>
            </Col>
          ))}
        </Row>

        <Divider orientation="left" style={{ fontSize: 12, color: "#9ca3af" }}>Editable Details</Divider>

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="John" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input placeholder="Doe" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="phone_number" label="Phone Number" rules={phoneFormRules({ label: "Phone number" })}>
            <PhoneInput />
          </Form.Item>
          <Form.Item name="bio" label="Bio / About">
            <Input.TextArea rows={3} placeholder="Write a short bio about yourself..." />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </Form>

        <Divider orientation="left" style={{ fontSize: 12, color: "#9ca3af" }}>Security & 2-Factor Authentication</Divider>

        <div style={{
          background: "var(--bms-surface-2)",
          borderRadius: 10,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          border: "1px solid var(--bms-border)",
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--bms-text)", display: "flex", alignItems: "center", gap: 8 }}>
              <SafetyOutlined style={{ color: me?.totp_enabled ? "#059669" : "#3b82f6" }} />
              Google Authenticator (2FA)
              {me?.totp_enabled && (
                <span style={{ fontSize: 11, background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0", padding: "1px 8px", borderRadius: 12, fontWeight: 600 }}>
                  Active
                </span>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
              {me?.totp_enabled
                ? "Your account is secured with Google Authenticator."
                : "Protect your account by adding 6-digit TOTP verification with Google or Microsoft Authenticator."}
            </Text>
          </div>

          <div>
            {me?.totp_enabled ? (
              <Popconfirm
                title="Disable 2-Factor Authentication?"
                description="Are you sure you want to turn off Google Authenticator for your account?"
                onConfirm={handleDisableTotp}
                okText="Disable"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button danger loading={totpLoading}>Disable 2FA</Button>
              </Popconfirm>
            ) : (
              <Button type="primary" icon={<SafetyOutlined />} onClick={handleOpenTotpModal} loading={totpLoading}>
                Setup 2FA
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* TOTP Setup Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SafetyOutlined style={{ color: "#3b82f6" }} />
            <span>Setup Google Authenticator (2FA)</span>
          </div>
        }
        open={totpModalOpen}
        onCancel={() => { setTotpModalOpen(false); setTotpCodeInput(""); }}
        footer={null}
        width={440}
        centered
      >
        <div style={{ textAlign: "center", paddingTop: 12 }}>
          {totpData?.qr_code ? (
            <div style={{ background: "#ffffff", padding: 16, borderRadius: 12, display: "inline-block", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 16 }}>
              <img src={totpData.qr_code} alt="2FA QR Code" style={{ width: 180, height: 180, display: "block" }} />
            </div>
          ) : (
            <Spin style={{ margin: "24px 0" }} />
          )}

          <div style={{ fontSize: 13, color: "var(--bms-text-2)", marginBottom: 16, textAlign: "left" }}>
            <ol style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Open <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> on your smartphone.</li>
              <li>Tap <b>+</b> ➔ <b>Scan a QR code</b> and scan the image above.</li>
              <li>Enter the 6-digit verification code generated by the app below:</li>
            </ol>
          </div>

          {totpData?.secret && (
            <div style={{ marginBottom: 16, background: "var(--bms-surface-2)", padding: "6px 12px", borderRadius: 8, fontSize: 12, color: "var(--bms-text-3)" }}>
              Manual Key: <Text code style={{ fontSize: 12, fontWeight: 700 }}>{totpData.secret}</Text>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <Input
              size="large"
              placeholder="000000"
              maxLength={6}
              value={totpCodeInput}
              onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ""))}
              style={{ textAlign: "center", fontSize: 22, letterSpacing: 6, fontWeight: 700, borderRadius: 8 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => { setTotpModalOpen(false); setTotpCodeInput(""); }}>Cancel</Button>
            <Button
              type="primary"
              disabled={totpCodeInput.trim().length !== 6}
              loading={totpLoading}
              onClick={handleVerifyEnableTotp}
            >
              Verify & Enable 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
