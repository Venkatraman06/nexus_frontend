import { Button, Tooltip } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useThemeStore } from "@/store/theme";

export default function ThemeToggle() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <Tooltip title={isDark ? "Switch to light theme" : "Switch to dark theme"}>
      <Button
        type="default"
        icon={isDark ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderRadius: 8,
          fontWeight: 500,
        }}
      >
        {isDark ? "Light" : "Dark"}
      </Button>
    </Tooltip>
  );
}
