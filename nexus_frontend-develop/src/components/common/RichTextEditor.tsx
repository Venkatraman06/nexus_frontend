import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined,
  OrderedListOutlined, UnorderedListOutlined,
  UndoOutlined, RedoOutlined, LinkOutlined,
  StrikethroughOutlined, AlignLeftOutlined,
  AlignCenterOutlined, AlignRightOutlined,
} from "@ant-design/icons";
import { Tooltip, Button, Divider } from "antd";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

function ToolbarButton({
  title, active, disabled, onClick, icon,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Tooltip title={title} mouseEnterDelay={0.6}>
      <Button
        type={active ? "primary" : "text"}
        size="small"
        icon={icon}
        onClick={onClick}
        disabled={disabled}
        style={{
          width: 28, height: 28, padding: 0,
          borderRadius: 4,
          ...(active ? {} : { color: "#374151" }),
        }}
      />
    </Tooltip>
  );
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write a description...",
  minHeight = 160,
  readOnly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { HTMLAttributes: { class: "rte-ul" } },
        orderedList: { HTMLAttributes: { class: "rte-ol" } },
        codeBlock: { HTMLAttributes: { class: "rte-code-block" } },
        blockquote: { HTMLAttributes: { class: "rte-blockquote" } },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    // initialise with whatever the form passes on mount
    content: value || "",
    editable: !readOnly,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange?.(html === "<p></p>" ? "" : html);
    },
  });

  // Sync when Ant Design form.setFieldsValue() pushes a new value (e.g. edit open / reset)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = value ?? "";
    // Normalise: treat "<p></p>" the same as ""
    const current = editor.getHTML().replace(/<p><\/p>$/, "");
    const normalised = incoming.replace(/<p><\/p>$/, "");
    if (current !== normalised) {
      editor.commands.setContent(incoming || "", { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      style={{
        border: "1px solid #d9d9d9",
        borderRadius: 8,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
      onFocusCapture={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#1677ff";
        el.style.boxShadow = "0 0 0 2px rgba(22,119,255,0.1)";
      }}
      onBlurCapture={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "#d9d9d9";
        el.style.boxShadow = "none";
      }}
    >
      {/* ── Toolbar ── */}
      {!readOnly && (
        <div
          style={{
            display: "flex", alignItems: "center", flexWrap: "wrap",
            gap: 2, padding: "6px 8px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
          }}
        >
          {/* Heading */}
          <select
            style={{
              height: 26, fontSize: 12, border: "1px solid #e5e7eb",
              borderRadius: 4, padding: "0 4px", color: "#374151",
              background: "#fff", cursor: "pointer",
            }}
            value={
              editor.isActive("heading", { level: 1 }) ? "h1"
              : editor.isActive("heading", { level: 2 }) ? "h2"
              : editor.isActive("heading", { level: 3 }) ? "h3"
              : "p"
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "p") editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: parseInt(v[1]) as 1|2|3 }).run();
            }}
          >
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          <Divider type="vertical" style={{ margin: "0 2px", height: 18 }} />

          {/* Inline marks */}
          <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()} icon={<BoldOutlined />} />
          <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()} icon={<ItalicOutlined />} />
          <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()} icon={<UnderlineOutlined />} />
          <ToolbarButton title="Strikethrough" active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()} icon={<StrikethroughOutlined />} />

          <Divider type="vertical" style={{ margin: "0 2px", height: 18 }} />

          {/* Lists */}
          <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<UnorderedListOutlined />} />
          <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()} icon={<OrderedListOutlined />} />

          <Divider type="vertical" style={{ margin: "0 2px", height: 18 }} />

          {/* Alignment */}
          <ToolbarButton title="Align left" active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()} icon={<AlignLeftOutlined />} />
          <ToolbarButton title="Align center" active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()} icon={<AlignCenterOutlined />} />
          <ToolbarButton title="Align right" active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()} icon={<AlignRightOutlined />} />

          <Divider type="vertical" style={{ margin: "0 2px", height: 18 }} />

          {/* Link */}
          <ToolbarButton title="Insert link" active={editor.isActive("link")}
            onClick={addLink} icon={<LinkOutlined />} />

          <Divider type="vertical" style={{ margin: "0 2px", height: 18 }} />

          {/* Code block */}
          <ToolbarButton title="Code block" active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            icon={<span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{"</>"}</span>}
          />

          {/* Blockquote */}
          <ToolbarButton title="Blockquote" active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            icon={<span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>"</span>}
          />

          <div style={{ flex: 1 }} />

          {/* Undo / Redo */}
          <ToolbarButton title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()} icon={<UndoOutlined />} />
          <ToolbarButton title="Redo (Ctrl+Y)" disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()} icon={<RedoOutlined />} />
        </div>
      )}

      {/* ── Editor area ── */}
      <EditorContent
        editor={editor}
        style={{ minHeight, padding: "10px 14px", cursor: "text" }}
      />

      {/* ── Global styles injected inline via a style tag ── */}
      <style>{`
        .tiptap { outline: none; font-size: 14px; line-height: 1.7; color: #1f2937; }
        .tiptap p { margin: 0 0 4px; }
        .tiptap h1 { font-size: 20px; font-weight: 700; margin: 8px 0 4px; }
        .tiptap h2 { font-size: 17px; font-weight: 700; margin: 6px 0 4px; }
        .tiptap h3 { font-size: 15px; font-weight: 600; margin: 4px 0 4px; }
        .rte-ul, .rte-ol { padding-left: 20px; margin: 4px 0; }
        .rte-ul li, .rte-ol li { margin-bottom: 2px; }
        .tiptap a { color: #1677ff; text-decoration: underline; }
        .tiptap strong { font-weight: 700; }
        .rte-code-block {
          background: #f3f4f6; border-radius: 6px; padding: 10px 14px;
          font-family: monospace; font-size: 13px; margin: 6px 0;
          border: 1px solid #e5e7eb; overflow-x: auto;
        }
        .rte-blockquote {
          border-left: 3px solid #d1d5db; padding-left: 12px;
          color: #6b7280; margin: 6px 0; font-style: italic;
        }
        .tiptap p.is-editor-empty:first-child::before {
          color: #9ca3af; content: attr(data-placeholder);
          float: left; height: 0; pointer-events: none;
        }
      `}</style>
    </div>
  );
}
