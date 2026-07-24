import { Typography } from "antd";
import { Link } from "react-router-dom";
import ThemeToggle from "@/components/common/ThemeToggle";

const { Title, Text } = Typography;

function PMTLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 4h2v-2h2v2h2v2h-2v2h-2v-2h-2v-2z" fill="white" />
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
      background: "var(--pmt-bg, #f0f4f8)",
      fontFamily: "var(--pmt-font)",
      padding: "32px 16px",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <ThemeToggle />
      </div>

      <div className="pmt-auth-card" style={{
        width: "100%",
        maxWidth: 440,
        background: "var(--pmt-surface, #fff)",
        borderRadius: 16,
        padding: "40px 36px",
        boxShadow: "0 8px 32px rgba(6,15,30,0.08)",
        border: "1px solid var(--pmt-border, #e8edf2)",
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14,
          background: "var(--pmt-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 22,
          boxShadow: "0 4px 18px color-mix(in srgb, var(--pmt-primary) 32%, transparent)",
        }}>
          <PMTLogo size={28} />
        </div>

        <Title level={2} style={{
          margin: 0, fontWeight: 800, color: "var(--pmt-text)",
          fontSize: 24, letterSpacing: -0.5,
        }}>
          {title}
        </Title>
        <Text style={{
          color: "var(--pmt-text-2)", fontSize: 14,
          marginTop: 6, display: "block", lineHeight: 1.5, marginBottom: 28,
        }}>
          {subtitle}
        </Text>

        {children}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link to={backTo} style={{ color: "var(--pmt-primary)", fontSize: 13, fontWeight: 500 }}>
            ← {backLabel}
          </Link>
        </div>

        <Text style={{
          display: "block", textAlign: "center",
          color: "var(--pmt-text-3)", fontSize: 11.5, marginTop: 20,
        }}>
          © 2025 Hackers Infotech
        </Text>
      </div>
    </div>
  );
}
