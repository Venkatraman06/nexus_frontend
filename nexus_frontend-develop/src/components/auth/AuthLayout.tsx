import { Typography } from "antd";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/common/ThemeToggle";

const { Title, Text } = Typography;

function NexusLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.15" />
      <path d="M8 22V10l4 7 4-7 4 7 4-7v12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  backTo = "/login",
  backLabel = "Back to sign in",
}: AuthLayoutProps) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bms-bg, #f0f4f8)",
      fontFamily: "'Inter', sans-serif",
      padding: "32px 16px",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <ThemeToggle />
      </div>

      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "var(--bms-surface, #fff)",
        borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 8px 32px rgba(6,15,30,0.08)",
        border: "1px solid var(--bms-border, #e8edf2)",
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14,
          background: "#1677ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 22,
          boxShadow: "0 4px 18px rgba(22,119,255,0.32)",
        }}>
          <NexusLogo size={28} />
        </div>

        <Title level={2} style={{
          margin: 0, fontWeight: 800, color: "var(--bms-text)",
          fontSize: 24, letterSpacing: -0.5,
        }}>
          {title}
        </Title>
        <Text style={{
          color: "var(--bms-text-2)", fontSize: 14,
          marginTop: 6, display: "block", lineHeight: 1.5, marginBottom: 28,
        }}>
          {subtitle}
        </Text>

        {children}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link to={backTo} style={{ color: "#1677ff", fontSize: 13, fontWeight: 500 }}>
            ← {backLabel}
          </Link>
        </div>

        <Text style={{
          display: "block", textAlign: "center",
          color: "var(--bms-text-3)", fontSize: 11.5, marginTop: 20,
        }}>
          © 2025 Hackers Infotech
        </Text>
      </div>
    </div>
  );
}
