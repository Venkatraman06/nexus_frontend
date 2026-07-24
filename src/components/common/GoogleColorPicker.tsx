import { CheckOutlined, EditOutlined } from "@ant-design/icons";

const GOOGLE_COLORS = [
  "#b35d76", // Dusty Rose
  "#e59a93", // Blush Pink
  "#b79bc9", // Lavender Mist
  "#98b7e2", // Sky Blue
  "#48778f", // Ocean Teal
  "#b5dcd0", // Mint Green
  "#e58e65", // Peach Sunset
  "#7e5246", // Mocha Brown
];

export default function GoogleColorPicker({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Custom Edit Button (just visual to match the screenshot) */}
        <button
          type="button"
          style={{
            width: 24, height: 24, borderRadius: "50%",
            border: "1px solid var(--pmt-border, #d9d9d9)", background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--pmt-text-2, #5f6368)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
          title="Custom color (mock)"
        >
          <EditOutlined style={{ fontSize: 12 }} />
        </button>

        {GOOGLE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{
              width: 24, height: 24, borderRadius: "50%",
              border: "none", background: c,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
              position: "relative",
            }}
          >
            {value === c && <CheckOutlined style={{ fontSize: 12, fontWeight: "bold" }} />}
          </button>
        ))}
      </div>

    </div>
  );
}
