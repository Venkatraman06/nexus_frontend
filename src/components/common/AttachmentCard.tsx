import { useState } from "react";
import { Button, Dropdown, Modal, Tag, Typography, Tooltip, message } from "antd";
import {
  DownloadOutlined, FileExcelOutlined, FileImageOutlined, FileOutlined,
  FilePdfOutlined, FilePptOutlined, FileTextOutlined, FileWordOutlined,
  FileZipOutlined, MoreOutlined, LinkOutlined, CopyOutlined, CloseOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export interface AttachmentCardData {
  id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  scan_status: "PENDING" | "CLEAN" | "INFECTED" | "ERROR";
  download_url: string | null;
}

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

function fileKind(filename: string, contentType: string): {
  icon: React.ReactNode; color: string; isImage: boolean; isPdf: boolean;
} {
  const ext = extOf(filename);
  if ((contentType && contentType.startsWith("image/")) || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return { icon: <FileImageOutlined />, color: "#722ed1", isImage: true, isPdf: false };
  }
  if (contentType === "application/pdf" || ext === "pdf") {
    return { icon: <FilePdfOutlined />, color: "#f5222d", isImage: false, isPdf: true };
  }
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return { icon: <FileExcelOutlined />, color: "#389e0d", isImage: false, isPdf: false };
  }
  if (["doc", "docx"].includes(ext)) {
    return { icon: <FileWordOutlined />, color: "#1677ff", isImage: false, isPdf: false };
  }
  if (["ppt", "pptx"].includes(ext)) {
    return { icon: <FilePptOutlined />, color: "#d4380d", isImage: false, isPdf: false };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return { icon: <FileZipOutlined />, color: "#d48806", isImage: false, isPdf: false };
  }
  if (["txt", "md", "log"].includes(ext)) {
    return { icon: <FileTextOutlined />, color: "#595959", isImage: false, isPdf: false };
  }
  return { icon: <FileOutlined />, color: "#595959", isImage: false, isPdf: false };
}

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface AttachmentCardProps {
  attachment: AttachmentCardData;
  mine?: boolean;
  forceDocumentView?: boolean;
}

export default function AttachmentCard({ attachment, mine, forceDocumentView }: AttachmentCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { original_filename, content_type, size_bytes, scan_status, download_url } = attachment;
  const { icon, color, isImage: rawIsImage, isPdf } = fileKind(original_filename, content_type || "");
  const isImage = !forceDocumentView && rawIsImage;
  const clean = scan_status === "CLEAN" && !!download_url;

  const handleCopyImage = async (targetUrl: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!targetUrl) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const res = await fetch(targetUrl);
        const blob = await res.blob();
        let pngBlob = blob;
        if (!blob.type.includes("png")) {
          const img = new Image();
          img.src = targetUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 300;
          canvas.height = img.height || 200;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || blob), "image/png"));
        }
        await navigator.clipboard.write([
          new ClipboardItem({ [pngBlob.type || "image/png"]: pngBlob }),
        ]);
        message.success("Image copied to clipboard!");
        return;
      }
      await navigator.clipboard.writeText(targetUrl);
      message.success("Image copied to clipboard!");
    } catch (err) {
      try {
        await navigator.clipboard.writeText(targetUrl);
        message.success("Image link copied!");
      } catch (e2) {
        message.error("Could not copy image");
      }
    }
  };

  const handleSaveImageAs = async (targetUrl: string, filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!targetUrl) return;
    try {
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      message.success("Image downloading...");
    } catch (err) {
      const link = document.createElement("a");
      link.href = targetUrl;
      link.download = filename || "image.png";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("Image downloading...");
    }
  };

  // WhatsApp Style Media Image Card Rendering
  if (isImage) {
    const storedDataUrl = typeof window !== "undefined" ? localStorage.getItem(`chat_img_${original_filename}`) : null;
    const imageUrl = download_url || storedDataUrl || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%231e293b"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%2338bdf8" font-size="28" font-family="sans-serif">🖼️ Image</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12" font-family="sans-serif">${encodeURIComponent(original_filename)}</text></svg>`;
    return (
      <>
        <div
          onClick={() => setPreviewOpen(true)}
          style={{
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            cursor: "pointer",
            maxWidth: 300,
            width: "100%",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            border: mine ? "1px solid rgba(255,255,255,0.2)" : "1px solid #e5e7eb",
            background: "#000",
          }}
        >
          <img
            src={imageUrl}
            alt={original_filename}
            onLoad={() => {
              window.dispatchEvent(new Event("resize"));
            }}
            style={{
              width: "100%",
              maxHeight: 260,
              objectFit: "cover",
              display: "block",
              borderRadius: 12,
            }}
          />

          {/* Overlay Gradient with filename and actions */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              inset: "auto 0 0 0",
              background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
              padding: "16px 10px 6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#fff",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 6 }}>
              {original_filename}
            </span>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "copy", label: "Copy Image", icon: <CopyOutlined /> },
                  { key: "download", label: "Save Image As...", icon: <DownloadOutlined /> },
                  { key: "open", label: "Open Original", icon: <LinkOutlined /> },
                ],
                onClick: ({ key, domEvent }) => {
                  domEvent.stopPropagation();
                  if (key === "copy") handleCopyImage(imageUrl);
                  else if (key === "download") handleSaveImageAs(imageUrl, original_filename);
                  else if (key === "open") window.open(imageUrl, "_blank", "noopener,noreferrer");
                },
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined style={{ color: "#fff", fontSize: 16 }} />}
                onClick={(e) => e.stopPropagation()}
                style={{ flexShrink: 0 }}
              />
            </Dropdown>
          </div>
        </div>

        {/* WhatsApp Lightbox Preview Modal */}
        <Modal
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          footer={null}
          width={800}
          centered
          styles={{
            content: { background: "rgba(15, 23, 42, 0.95)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)", padding: 0, overflow: "hidden" },
            body: { padding: 0, position: "relative" }
          }}
          closeIcon={null}
        >
          {/* Lightbox Header Bar */}
          <div
            style={{
              padding: "12px 20px",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#fff",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {original_filename}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Tooltip title="Copy Image">
                <Button
                  type="text"
                  icon={<CopyOutlined style={{ color: "#fff", fontSize: 16 }} />}
                  onClick={(e) => handleCopyImage(imageUrl, e)}
                />
              </Tooltip>
              <Tooltip title="Save Image As...">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={(e) => handleSaveImageAs(imageUrl, original_filename, e)}
                  size="small"
                >
                  Save As
                </Button>
              </Tooltip>
              <Tooltip title="Close">
                <Button
                  type="text"
                  icon={<CloseOutlined style={{ color: "#fff", fontSize: 16 }} />}
                  onClick={() => setPreviewOpen(false)}
                />
              </Tooltip>
            </div>
          </div>

          <div style={{ padding: 24, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
            <img src={imageUrl} alt={original_filename} style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", objectFit: "contain" }} />
          </div>
        </Modal>
      </>
    );
  }

  // Standard File Attachment Card (PDF, Zip, Doc, Excel, etc.)
  const openPreview = () => {
    if (clean) setPreviewOpen(true);
  };

  return (
    <>
      <div
        onClick={openPreview}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: 220, maxWidth: "100%", padding: "8px 8px 8px 10px",
          borderRadius: 8, cursor: clean ? "pointer" : "default",
          border: `1px solid ${mine ? "rgba(255,255,255,0.35)" : "var(--pmt-border, #e5e7eb)"}`,
          background: mine ? "rgba(255,255,255,0.12)" : "var(--pmt-surface, #fff)",
        }}
      >
        <span style={{ fontSize: 22, color, flexShrink: 0 }}>{icon}</span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis", color: mine ? "#fff" : "var(--pmt-text, #1f2937)",
          }}>
            {original_filename}
          </div>
          {clean ? (
            <Text style={{ fontSize: 11, color: mine ? "rgba(255,255,255,0.75)" : "#8c8c8c" }}>
              {formatSize(size_bytes)}
            </Text>
          ) : (
            <Tag
              style={{ marginTop: 2, fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
              color={scan_status === "INFECTED" ? "red" : scan_status === "ERROR" ? "orange" : "default"}
            >
              {scan_status === "PENDING" ? "Scanning…" : scan_status.toLowerCase()}
            </Tag>
          )}
        </div>

        {clean && (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "copy", label: "Copy Link", icon: <CopyOutlined /> },
                { key: "download", label: "Download", icon: <DownloadOutlined /> },
                { key: "open", label: "Open in new tab", icon: <LinkOutlined /> },
              ],
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (!download_url) return;
                if (key === "copy") handleCopyImage(download_url);
                else if (key === "download") handleSaveImageAs(download_url, original_filename);
                else window.open(download_url, "_blank", "noopener,noreferrer");
              },
            }}
          >
            <Button
              type="text" size="small" icon={<MoreOutlined style={{ color: mine ? "#fff" : undefined }} />}
              onClick={(e) => e.stopPropagation()}
              style={{ flexShrink: 0 }}
            />
          </Dropdown>
        )}
      </div>

      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => download_url && handleCopyImage(download_url)}>
            Copy Link
          </Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={() => download_url && handleSaveImageAs(download_url, original_filename)}>
            Download
          </Button>,
        ]}
        title={original_filename}
        width={isPdf ? 760 : 420}
      >
        {isPdf && download_url ? (
          <iframe src={download_url} title={original_filename} style={{ width: "100%", height: "75vh", border: "none" }} />
        ) : (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#8c8c8c" }}>
            <div style={{ fontSize: 40, color, marginBottom: 8 }}>{icon}</div>
            Preview isn't available for this file type — download it to view.
          </div>
        )}
      </Modal>
    </>
  );
}
