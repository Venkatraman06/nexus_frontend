import re

with open("src/pages/workspace/TodoDetailDrawer.tsx", "r") as f:
    content = f.read()

# Add imports
content = content.replace('import { Drawer, Button, Tag, Space, Typography, Divider, Popconfirm } from "antd";', 'import { useState, useEffect } from "react";\nimport { Drawer, Button, Tag, Space, Typography, Divider, Popconfirm, Popover, message } from "antd";')
content = content.replace('import { TodoItem, TODO_PRIORITIES } from "@/services/todos";', 'import { TodoItem, TODO_PRIORITIES, todoApi } from "@/services/todos";')

content = content.replace('import {\n  EditOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined, UserOutlined,\n} from "@ant-design/icons";', 'import {\n  EditOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined, UserOutlined,\n  MessageOutlined, SmileOutlined\n} from "@ant-design/icons";\nimport { useMutation, useQueryClient } from "@tanstack/react-query";\nimport { useAuthStore } from "@/store/auth";')

helpers = """
/* ── Helpers ────────────────────────────────────────────────── */

function parseComments(raw: string): { author: string; date: string; body: string }[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split("\\n");
  const entries: { author: string; date: string; body: string }[] = [];
  let current: { author: string; date: string; body: string } | null = null;

  const headerRe = /^(.+?) \\((\\d{2} \\w+ \\d{4}, \\d{2}:\\d{2} [AP]M)\\):$/;

  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (current) entries.push(current);
      current = { author: m[1].trim(), date: m[2].trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\\n" : "") + line;
    }
  }
  if (current) entries.push(current);
  return entries;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const AVATAR_COLORS = [
  "#c7d2fe", "#a5b4fc", "#93c5fd", "#6ee7b7", "#fca5a5",
  "#fcd34d", "#f9a8d4", "#d8b4fe",
];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <>
      <Divider style={{ margin: "14px 0" }} />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: "#6b7280", fontSize: 18, marginTop: 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ fontSize: 14, display: "block", marginBottom: 6 }}>
            {label}
          </Text>
          {children}
        </div>
      </div>
    </>
  );
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😊", "🥹", "😍", "🥳", "😎", "👍", "👎", "👏", "🙌", "🤝",
  "🙏", "❤️", "🔥", "✨", "🚀", "💡", "🎯", "📌", "✅", "❌", "💬", "👀", "⚡", "💯",
];
"""

content = content.replace("const { Text, Title, Paragraph } = Typography;", f"const {{ Text, Title, Paragraph }} = Typography;\n{helpers}")

# Modify component to add local state and mutation
component_start = """}) {
  const [localItem, setLocalItem] = useState<TodoItem | null>(null);

  useEffect(() => { setLocalItem(item); }, [item]);

  const activeItem = localItem || item;
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const addCommentMutation = useMutation({
    mutationFn: (newComment: string) => {
      if (!activeItem) throw new Error("No item selected");
      const { color, cleanText } = extractCustomColor(activeItem.comments || "");
      const formattedTime = dayjs().format("DD MMM YYYY, hh:mm A");
      const authorName = user?.full_name || user?.username || "Unknown User";
      const commentHeader = `${authorName} (${formattedTime}):`;
      const newThread = cleanText
        ? `${cleanText}\\n\\n${commentHeader}\\n${newComment}`
        : `${commentHeader}\\n${newComment}`;
      const finalComments = newThread + (color ? ` <!--color:${color}-->` : "");
      return todoApi.update(activeItem.id, { comments: finalComments });
    },
    onSuccess: (data) => {
      setCommentText("");
      message.success("Comment added");
      setLocalItem((prev) => prev ? { ...prev, comments: data.comments } : null);
      qc.invalidateQueries({ queryKey: ["todos-board"] });
      qc.invalidateQueries({ queryKey: ["todos-list"] });
      qc.invalidateQueries({ queryKey: ["employee-dashboard"] });
      qc.invalidateQueries({ queryKey: ["workspace-calendar"] });
    },
    onError: () => { message.error("Failed to add comment"); },
  });

  if (!activeItem) return null;

  const isFinal = activeItem.workflow_state_slug === "done" || activeItem.workflow_state_slug === "cancelled";
  const pri = TODO_PRIORITIES.find((p) => p.value === activeItem.priority) ?? TODO_PRIORITIES[1];
  const timeRange = formatTimeRange(activeItem.start_time, activeItem.end_time);"""

content = re.sub(r'}\) \{\n  if \(\!item\) return null;\n\n  const isFinal = item.*?const timeRange = formatTimeRange\(item\.start_time, item\.end_time\);', component_start, content, flags=re.DOTALL)

# Replace item with activeItem in JSX
content = content.replace("item.title", "activeItem.title")
content = content.replace("item.priority_label", "activeItem.priority_label")
content = content.replace("item.priority", "activeItem.priority")
content = content.replace("item.workflow_state_color", "activeItem.workflow_state_color")
content = content.replace("item.workflow_state_name", "activeItem.workflow_state_name")
content = content.replace("item.is_overdue", "activeItem.is_overdue")
content = content.replace("item.start_date", "activeItem.start_date")
content = content.replace("item.due_date", "activeItem.due_date")
content = content.replace("item.assignees_data", "activeItem.assignees_data")
content = content.replace("item.reporter_name", "activeItem.reporter_name")
content = content.replace("item.description", "activeItem.description")
content = content.replace("item.id", "activeItem.id")
content = content.replace("item.can_transition", "activeItem.can_transition")
content = content.replace("onEdit(item)", "onEdit(activeItem)")
content = content.replace("onDone(item)", "onDone(activeItem)")


comments_ui = """
      {activeItem.description && extractCustomColor(activeItem.description).cleanText && (
        <>
          <Divider style={{ margin: "16px 0 12px" }} />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Description</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{extractCustomColor(activeItem.description).cleanText}</Paragraph>
        </>
      )}

      {activeItem.content && extractCustomColor(activeItem.content).cleanText && (
        <>
          <Divider style={{ margin: "16px 0 12px" }} />
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>Content</Text>
          <Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{extractCustomColor(activeItem.content).cleanText}</Paragraph>
        </>
      )}

      <Section icon={<MessageOutlined />} label="Comments">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {parseComments(extractCustomColor(activeItem.comments || "").cleanText).map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: avatarColor(c.author), display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "rgba(0,0,0,0.6)", fontWeight: 600, fontSize: 13,
                flexShrink: 0, marginTop: 2,
              }}>
                {initials(c.author)}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>{c.author}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{c.date}</span>
                </div>
                <div style={{
                  fontSize: 13, color: "#4b5563", lineHeight: 1.5,
                  background: "#f3f4f6", padding: "8px 12px",
                  borderRadius: "0 12px 12px 12px", whiteSpace: "pre-wrap",
                  display: "inline-block",
                }}>
                  {c.body}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ position: "relative" }}>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              style={{
                width: "100%", boxSizing: "border-box",
                borderRadius: 10, border: "1px solid #e5e7eb",
                padding: "10px 40px 10px 12px", fontSize: 13,
                resize: "none", outline: "none",
                fontFamily: "inherit", color: "#374151",
                lineHeight: 1.5,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && commentText.trim()) {
                  addCommentMutation.mutate(commentText.trim());
                }
              }}
            />
            <Popover
              content={
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, width: 220, padding: 4 }}>
                  {EMOJIS.map((emoji) => (
                    <span
                      key={emoji}
                      onClick={() => {
                        setCommentText((prev) => prev + emoji);
                        setEmojiPickerOpen(false);
                      }}
                      style={{
                        fontSize: 20, cursor: "pointer", textAlign: "center",
                        padding: 4, borderRadius: 4, userSelect: "none",
                      }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              }
              trigger="click"
              open={emojiPickerOpen}
              onOpenChange={setEmojiPickerOpen}
              placement="topRight"
            >
              <SmileOutlined style={{
                position: "absolute", right: 12, bottom: 12,
                color: emojiPickerOpen ? "#2563eb" : "#9ca3af", fontSize: 18, cursor: "pointer",
                transition: "color 0.15s",
              }} />
            </Popover>
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="primary"
              size="small"
              onClick={() => { if (commentText.trim()) addCommentMutation.mutate(commentText.trim()); }}
              loading={addCommentMutation.isPending}
              disabled={!commentText.trim()}
              style={{ borderRadius: 8 }}
            >
              Post Comment
            </Button>
          </div>
        </div>
      </Section>
"""

content = re.sub(r'      \{activeItem\.description && extractCustomColor\(activeItem\.description\)\.cleanText && \(\n        <>\n          <Divider style=\{\{ margin: "16px 0 12px" \}\} />\n          <Text type="secondary" style=\{\{ fontSize: 11, display: "block", marginBottom: 4 \}\}>Description</Text>\n          <Paragraph style=\{\{ marginBottom: 0, whiteSpace: "pre-wrap" \}\}>\{extractCustomColor\(activeItem\.description\)\.cleanText\}</Paragraph>\n        </>\n      \)\}', comments_ui, content, flags=re.DOTALL)

with open("src/pages/workspace/TodoDetailDrawer.tsx", "w") as f:
    f.write(content)
