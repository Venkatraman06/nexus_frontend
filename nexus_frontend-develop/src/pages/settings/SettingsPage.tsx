import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Typography, Card, Form, Input, Button, Avatar, message,
  Row, Col, Divider, Spin, Tabs, DatePicker, Select, Tag, Popconfirm, Upload,
} from "antd";
import {
  UserOutlined, CameraOutlined, SaveOutlined, InboxOutlined,
  DeleteOutlined, DownloadOutlined, FilePdfOutlined, FileImageOutlined,
  FileTextOutlined, FileUnknownOutlined, IdcardOutlined, PhoneOutlined,
  HomeOutlined, ContactsOutlined, UploadOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

import { get, patch } from "@/services/api";
import client from "@/services/api";
import { documentApi, type EmployeeDocument } from "@/services/documents";
import PhoneInput from "@/components/common/PhoneInput";
import { phoneFormRules } from "@/utils/phone";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Dragger } = Upload;

interface MeProfile {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  employee_code: string;
  designation: string;
  department: string;
  grade: string;
  phone_number: string;
  alternative_number: string;
  address: string;
  date_of_birth: string | null;
  gender: string;
  bio: string;
  profile_picture_url: string | null;
  keycloak_group: string;
  joining_date: string | null;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState<string>("CERTIFICATE");
  const [docTitle, setDocTitle] = useState<string>("");
  const [fileList, setFileList] = useState<any[]>([]);

  // Fetch current user details
  const { data: me, isLoading: meLoading } = useQuery<MeProfile>({
    queryKey: ["me"],
    queryFn: () => get("/users/me/"),
    staleTime: 60_000,
  });

  // Fetch employee documents
  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery<EmployeeDocument[]>({
    queryKey: ["employee-documents"],
    queryFn: () => documentApi.list(),
  });

  useEffect(() => {
    if (me) {
      form.setFieldsValue({
        first_name: me.first_name || (me.full_name ?? "").split(" ")[0] || "",
        last_name: me.last_name || (me.full_name ?? "").split(" ").slice(1).join(" ") || "",
        phone_number: me.phone_number ?? "",
        alternative_number: me.alternative_number ?? "",
        address: me.address ?? "",
        gender: me.gender || undefined,
        date_of_birth: me.date_of_birth ? dayjs(me.date_of_birth) : null,
        bio: me.bio ?? "",
        emergency_contact_name: me.emergency_contact?.name ?? "",
        emergency_contact_phone: me.emergency_contact?.phone ?? "",
        emergency_contact_relationship: me.emergency_contact?.relationship ?? "",
      });
    }
  }, [me, form]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      message.error("Image must be under 2MB");
      return;
    }
    setPendingFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const fd = new FormData();
      fd.append("first_name", values.first_name ?? "");
      fd.append("last_name", values.last_name ?? "");
      fd.append("phone_number", values.phone_number ?? "");
      fd.append("alternative_number", values.alternative_number ?? "");
      fd.append("address", values.address ?? "");
      fd.append("gender", values.gender ?? "");
      fd.append("date_of_birth", values.date_of_birth ? values.date_of_birth.format("YYYY-MM-DD") : "");
      fd.append("bio", values.bio ?? "");

      // Handle Emergency Contact JSON structure
      const emergencyContact = {
        name: values.emergency_contact_name ?? "",
        phone: values.emergency_contact_phone ?? "",
        relationship: values.emergency_contact_relationship ?? "",
      };
      fd.append("emergency_contact", JSON.stringify(emergencyContact));

      if (pendingFile) {
        fd.append("profile_picture", pendingFile);
      }

      await patch("/users/me/", fd);
      message.success("Profile updated successfully");
      setPendingFile(null);
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Document upload handler
  const handleUploadDocument = async () => {
    if (fileList.length === 0) {
      message.error("Please select a file to upload");
      return;
    }
    if (!docTitle.trim()) {
      message.error("Please enter a title for the document");
      return;
    }

    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("document_type", docType);
      fd.append("title", docTitle.trim());
      
      const fileObj = fileList[0]?.originFileObj || (fileList[0] instanceof File ? fileList[0] : null);
      if (!fileObj) {
        message.error("Please select a valid file to upload");
        setUploadingDoc(false);
        return;
      }
      fd.append("file", fileObj);

      await documentApi.create(fd);
      message.success("Document uploaded successfully");
      setDocTitle("");
      setFileList([]);
      refetchDocs();
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? "Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Document delete handler
  const handleDeleteDocument = async (id: string) => {
    try {
      await documentApi.delete(id);
      message.success("Document deleted successfully");
      refetchDocs();
    } catch (e: any) {
      message.error("Failed to delete document");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FilePdfOutlined style={{ fontSize: 32, color: "#ef4444" }} />;
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) {
      return <FileImageOutlined style={{ fontSize: 32, color: "#3b82f6" }} />;
    }
    if (["doc", "docx"].includes(ext || "")) {
      return <FileTextOutlined style={{ fontSize: 32, color: "#2563eb" }} />;
    }
    return <FileUnknownOutlined style={{ fontSize: 32, color: "#6b7280" }} />;
  };

  const getDocTypeTag = (type: string) => {
    switch (type) {
      case "IDENTITY_CARD":
        return <Tag color="green">Identity Card</Tag>;
      case "PAN_CARD":
        return <Tag color="blue">PAN Card</Tag>;
      case "PASSPORT":
        return <Tag color="purple">Passport</Tag>;
      case "CERTIFICATE":
        return <Tag color="orange">Certificate</Tag>;
      default:
        return <Tag color="default">{type}</Tag>;
    }
  };

  if (meLoading) return <div style={{ textAlign: "center", paddingTop: 80 }}><Spin size="large" /></div>;
  if (!me) return null;

  const avatarSrc = avatarPreview ?? me.profile_picture_url ?? undefined;
  const initials = me.full_name?.slice(0, 2).toUpperCase() || "U";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Self Service Profile</Title>
        <Text style={{ color: "#6b7280", fontSize: 13 }}>Manage your profile updates and official documents</Text>
      </div>

      <Tabs defaultActiveKey="profile" size="large" style={{ marginBottom: 40 }}>
        {/* TAB 1: PROFILE UPDATES */}
        <TabPane tab="Profile Details" key="profile">
          <Row gutter={24}>
            {/* Left: Editable details */}
            <Col xs={24} lg={14}>
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
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{me.employee_code} · {me.designation || "Employee"}</div>
                    {me.department && <div style={{ fontSize: 12, color: "#9ca3af" }}>{me.department}</div>}
                    <Text type="secondary" style={{ fontSize: 12 }}>Click avatar to change photo (max 2MB)</Text>
                  </div>
                </div>

                <Divider style={{ margin: "0 0 20px" }} />

                <Form form={form} layout="vertical">
                  {/* Personal details */}
                  <Title level={5} style={{ marginBottom: 16 }}><UserOutlined /> Personal Details</Title>
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
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="date_of_birth" label="Date of Birth" rules={[{ required: true, message: "Required" }]}>
                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Select DOB" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="gender" label="Gender">
                        <Select placeholder="Select Gender">
                          <Option value="M">Male</Option>
                          <Option value="F">Female</Option>
                          <Option value="O">Other</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="bio" label="Bio / About">
                    <Input.TextArea rows={3} placeholder="Write a short bio about yourself..." />
                  </Form.Item>

                  <Divider style={{ margin: "20px 0" }} />

                  {/* Contact details */}
                  <Title level={5} style={{ marginBottom: 16 }}><PhoneOutlined /> Contact Details</Title>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="phone_number" label="Primary Phone Number" rules={phoneFormRules({ label: "Phone number" })}>
                        <PhoneInput />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="alternative_number" label="Alternative Phone Number" rules={phoneFormRules({ label: "Alternative number", required: false })}>
                        <PhoneInput />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="address" label="Residential Address" rules={[{ required: true, message: "Required" }]}>
                    <Input.TextArea rows={2} placeholder="Enter your full residential address" />
                  </Form.Item>

                  <Divider style={{ margin: "20px 0" }} />

                  {/* Emergency contact */}
                  <Title level={5} style={{ marginBottom: 16 }}><ContactsOutlined /> Emergency Contact</Title>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="emergency_contact_name" label="Contact Name" rules={[{ required: true, message: "Required" }]}>
                        <Input placeholder="Emergency Contact Name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="emergency_contact_relationship" label="Relationship" rules={[{ required: true, message: "Required" }]}>
                        <Select placeholder="Select Relationship">
                          <Option value="Spouse">Spouse</Option>
                          <Option value="Parent">Parent</Option>
                          <Option value="Sibling">Sibling</Option>
                          <Option value="Child">Child</Option>
                          <Option value="Friend">Friend</Option>
                          <Option value="Other">Other</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="emergency_contact_phone" label="Contact Phone" rules={phoneFormRules({ label: "Contact Phone" })}>
                        <PhoneInput />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={handleSave}
                      size="large"
                      style={{ borderRadius: 8 }}
                    >
                      Save Profile Changes
                    </Button>
                  </div>
                </Form>
              </Card>
            </Col>

            {/* Right: Read-only Official Details */}
            <Col xs={24} lg={10}>
              <Card title={<span style={{ fontWeight: 700 }}><HomeOutlined /> Official Details</span>} style={{ borderRadius: 12, marginBottom: 20 }}>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 20 }}>
                  * The following official records are set by HR and cannot be modified by employees self-service.
                </Text>
                {[
                  { label: "Email Address", value: me.email },
                  { label: "Employee Code", value: me.employee_code },
                  { label: "Official Role / Group", value: me.keycloak_group || "—" },
                  { label: "Designation", value: me.designation || "—" },
                  { label: "Department", value: me.department || "—" },
                  { label: "Grade Level", value: me.grade || "—" },
                  { label: "Joining Date", value: me.joining_date ? dayjs(me.joining_date).format("YYYY-MM-DD") : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ marginBottom: 16, background: "#f8fafc", padding: "10px 14px", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* TAB 2: DOCUMENT UPLOADS */}
        <TabPane tab="Document Wallet" key="documents">
          <Row gutter={24}>
            {/* Left: Upload Form */}
            <Col xs={24} md={10}>
              <Card title="Upload Document" style={{ borderRadius: 12, marginBottom: 20 }}>
                <Form layout="vertical">
                  <Form.Item label="Document Type" required>
                    <Select value={docType} onChange={setDocType}>
                      <Option value="IDENTITY_CARD">Identity Card (Aadhar, License, etc.)</Option>
                      <Option value="PAN_CARD">PAN Card</Option>
                      <Option value="PASSPORT">Passport</Option>
                      <Option value="CERTIFICATE">Professional Certificate</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="Document Title" required>
                    <Input
                      placeholder="e.g. Passport - Front Page"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                    />
                  </Form.Item>

                  <Form.Item label="File Upload" required>
                    <Dragger
                      fileList={fileList}
                      beforeUpload={(file) => {
                        const isLt10M = file.size / 1024 / 1024 < 10;
                        if (!isLt10M) {
                          message.error("File must be smaller than 10MB!");
                          return Upload.LIST_IGNORE;
                        }
                        return false;
                      }}
                      onChange={({ fileList: fl }) => setFileList(fl)}
                      onRemove={() => setFileList([])}
                      maxCount={1}
                      style={{ background: "#fafafa", borderRadius: 8, padding: "20px 0" }}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined style={{ color: "#1677ff" }} />
                      </p>
                      <p className="ant-upload-text">Click or drag file to this area to upload</p>
                      <p className="ant-upload-hint">Supports PDF, PNG, JPG (Max 10MB)</p>
                    </Dragger>
                  </Form.Item>

                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={handleUploadDocument}
                    loading={uploadingDoc}
                    block
                    size="large"
                    style={{ borderRadius: 8, marginTop: 16 }}
                  >
                    Upload to Wallet
                  </Button>
                </Form>
              </Card>
            </Col>

            {/* Right: Uploaded Documents List */}
            <Col xs={24} md={14}>
              <Card title={`Uploaded Documents (${documents.length})`} style={{ borderRadius: 12, minHeight: 480 }}>
                {docsLoading ? (
                  <div style={{ textAlign: "center", paddingTop: 60 }}><Spin size="large" /></div>
                ) : documents.length === 0 ? (
                  <div style={{ textAlign: "center", paddingTop: 80, color: "#9ca3af" }}>
                    <InboxOutlined style={{ fontSize: 48, marginBottom: 12, color: "#d1d5db" }} />
                    <div>No documents uploaded yet. Upload your files on the left to secure them in your document wallet.</div>
                  </div>
                ) : (
                  <Row gutter={[16, 16]}>
                    {documents.map((doc) => (
                      <Col span={24} key={doc.id}>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "16px 20px", background: "#f8fafc", borderRadius: 12,
                          border: "1px solid #f1f5f9", transition: "all 0.3s"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            {getFileIcon(doc.title)}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{doc.title}</div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                                {getDocTypeTag(doc.document_type)}
                                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                                  Uploaded on {dayjs(doc.uploaded_at).format("YYYY-MM-DD HH:mm")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            {doc.file_url && (
                              <Button
                                type="text"
                                icon={<DownloadOutlined style={{ color: "#1677ff" }} />}
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                              />
                            )}
                            <Popconfirm
                              title="Delete Document"
                              description="Are you sure you want to delete this document from your wallet?"
                              onConfirm={() => handleDeleteDocument(doc.id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                              />
                            </Popconfirm>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
}
