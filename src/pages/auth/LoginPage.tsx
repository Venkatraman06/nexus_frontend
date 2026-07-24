// import { useState } from "react";
// import { Form, Input, Button, Alert, Typography } from "antd";
// import { UserOutlined, LockOutlined, EyeTwoTone, EyeInvisibleOutlined } from "@ant-design/icons";
// import { useNavigate, Link } from "react-router-dom";
// import { useAuthStore } from "@/store/auth";
// import { post } from "@/services/api";
// import { resolveLandingPath } from "@/utils/access";
// import ThemeToggle from "@/components/common/ThemeToggle";

// const { Title, Text } = Typography;

// const FEATURES = [
//   {
//     icon: (
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M3 3h7v9H3V3zm11 0h7v5h-7V3zm0 9h7v9h-7v-9zm-11 4h7v5H3v-5z" />
//       </svg>
//     ),
//     label: "Project Management",
//     desc: "Kanban boards, milestones & delivery",
//   },
//   {
//     icon: (
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
//       </svg>
//     ),
//     label: "HRMS & Attendance",
//     desc: "Employees, leaves & HR compliance",
//   },
//   {
//     icon: (
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
//       </svg>
//     ),
//     label: "Payroll & Finance",
//     desc: "Salary processing, TDS & payslips",
//   },
//   {
//     icon: (
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23L12.5 13V7z" />
//       </svg>
//     ),
//     label: "Timesheets",
//     desc: "Time tracking, logs & approvals",
//   },
//   {
//     icon: (
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
//       </svg>
//     ),
//     label: "Ticketing & Tasks",
//     desc: "Epics, stories, bugs & change requests",
//   },
//   {
//     icon: (
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
//       </svg>
//     ),
//     label: "Analytics & Reports",
//     desc: "Dashboards, utilization & portfolio",
//   },
//   {
//     icon: (
//       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
//         <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
//       </svg>
//     ),
//     label: "Payments & Vendors",
//     desc: "Invoices, vendors & payment tracking",
//   },
// ];

// function PMTLogo({ size = 24, color = "white" }: { size?: number; color?: string }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//       <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 4h2v-2h2v2h2v2h-2v2h-2v-2h-2v-2z" fill={color} />
//     </svg>
//   );
// }

// const WAVE_CSS = `
//   @keyframes blobDrift1 {
//     0%,100% { transform: translate(0px, 0px) scale(1) rotate(0deg); border-radius: 62% 38% 46% 54% / 60% 44% 56% 40%; }
//     20%      { transform: translate(45px,-70px) scale(1.12) rotate(8deg);  border-radius: 38% 62% 54% 46% / 44% 56% 44% 56%; }
//     45%      { transform: translate(-35px,55px) scale(0.92) rotate(-6deg); border-radius: 54% 46% 38% 62% / 56% 38% 62% 44%; }
//     70%      { transform: translate(60px,25px)  scale(1.08) rotate(12deg); border-radius: 46% 54% 62% 38% / 38% 62% 38% 62%; }
//   }
//   @keyframes blobDrift2 {
//     0%,100% { transform: translate(0px, 0px) scale(1) rotate(0deg); border-radius: 44% 56% 62% 38% / 54% 38% 62% 46%; }
//     30%      { transform: translate(-55px,65px)  scale(1.18) rotate(-10deg); border-radius: 62% 38% 44% 56% / 38% 62% 46% 54%; }
//     65%      { transform: translate(40px,-45px)  scale(0.88) rotate(7deg);  border-radius: 38% 62% 56% 44% / 62% 44% 38% 56%; }
//   }
//   @keyframes blobDrift3 {
//     0%,100% { transform: translate(0px, 0px) scale(1); border-radius: 50%; }
//     40%      { transform: translate(35px,-55px) scale(1.22); border-radius: 60% 40% 50% 50% / 40% 60% 40% 60%; }
//     80%      { transform: translate(-25px,40px) scale(0.85); border-radius: 40% 60% 40% 60% / 60% 40% 60% 40%; }
//   }
//   @keyframes blobDrift4 {
//     0%,100% { transform: translate(0px,0px) scale(1) rotate(0deg); border-radius: 56% 44% 38% 62% / 44% 56% 44% 56%; }
//     50%      { transform: translate(-40px,-60px) scale(1.15) rotate(-15deg); border-radius: 44% 56% 62% 38% / 56% 44% 56% 44%; }
//   }
// `;

// export default function LoginPage() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const { setToken, setRefreshToken, setUser, setPermissions } = useAuthStore();
//   const navigate = useNavigate();

//   const onFinish = async (values: { username: string; password: string }) => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await post<any>("/auth/token/", values);
//       setToken(res.access_token);
//       if (res.refresh_token) setRefreshToken(res.refresh_token);

//       const { get: apiGet } = await import("@/services/api");
//       const me = await apiGet<any>("/users/me/");
//       setUser({
//         ...me,
//         last_login: res.user?.last_login ?? me.last_login ?? null,
//       });
//       setPermissions(me.permissions ?? []);

//       navigate(resolveLandingPath(me, me.permissions ?? []), { replace: true });
//     } catch (err: any) {
//       const msg = err?.response?.data?.error || "Invalid username or password.";
//       setError(msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="pmt-login-page">

//       {/* ── Left brand panel ── */}
//       <div className="pmt-login-brand">
//         <style>{WAVE_CSS}</style>

//         <div style={{
//           position: "absolute",
//           width: 520, height: 520,
//           top: "10%", left: "-15%",
//           background: "radial-gradient(circle at 40% 40%, color-mix(in srgb, var(--pmt-primary) 42%, transparent) 0%, rgba(10,61,143,0.22) 45%, transparent 70%)",
//           filter: "blur(72px)",
//           animation: "blobDrift1 14s ease-in-out infinite",
//           pointerEvents: "none",
//         }} />
//         <div style={{
//           position: "absolute",
//           width: 380, height: 380,
//           top: "-8%", right: "-8%",
//           background: "radial-gradient(circle at 55% 55%, rgba(13,82,181,0.5) 0%, color-mix(in srgb, var(--pmt-primary) 18%, transparent) 50%, transparent 72%)",
//           filter: "blur(60px)",
//           animation: "blobDrift2 10s ease-in-out infinite",
//           pointerEvents: "none",
//         }} />
//         <div style={{
//           position: "absolute",
//           width: 280, height: 280,
//           bottom: "8%", right: "5%",
//           background: "radial-gradient(circle, color-mix(in srgb, var(--pmt-primary) 30%, transparent) 0%, rgba(6,42,110,0.2) 55%, transparent 75%)",
//           filter: "blur(50px)",
//           animation: "blobDrift3 8s ease-in-out infinite",
//           pointerEvents: "none",
//         }} />
//         <div style={{
//           position: "absolute",
//           width: 200, height: 200,
//           bottom: "20%", left: "5%",
//           background: "radial-gradient(circle, rgba(79,148,255,0.28) 0%, transparent 70%)",
//           filter: "blur(40px)",
//           animation: "blobDrift4 11s ease-in-out infinite",
//           pointerEvents: "none",
//         }} />

//         <div style={{ position: "relative", zIndex: 1 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
//             <div style={{
//               width: 46, height: 46, borderRadius: 13,
//               background: "var(--pmt-primary)",
//               display: "flex", alignItems: "center", justifyContent: "center",
//               boxShadow: "0 0 0 6px color-mix(in srgb, var(--pmt-primary) 18%, transparent), 0 4px 16px color-mix(in srgb, var(--pmt-primary) 35%, transparent)",
//             }}>
//               <PMTLogo size={26} />
//             </div>
//             <div>
//               <div style={{
//                 color: "#ffffff", fontSize: 21, fontWeight: 800,
//                 letterSpacing: -0.6, lineHeight: 1.1,
//               }}>
//                 PMT
//               </div>
//               <div style={{
//                 color: "rgba(255,255,255,0.38)", fontSize: 10.5,
//                 letterSpacing: 1.8, textTransform: "uppercase", marginTop: 2, fontWeight: 500,
//               }}>
//                 Project Management Tool
//               </div>
//             </div>
//           </div>
//         </div>

//         <div style={{
//           flex: 1, display: "flex", flexDirection: "column",
//           justifyContent: "center", position: "relative", zIndex: 1,
//           paddingTop: 48, paddingBottom: 32,
//         }}>
//           <div style={{
//             display: "inline-flex", alignItems: "center", gap: 8,
//             background: "color-mix(in srgb, var(--pmt-primary) 14%, transparent)",
//             border: "1px solid color-mix(in srgb, var(--pmt-primary) 25%, transparent)",
//             borderRadius: 20, padding: "5px 14px",
//             marginBottom: 22, width: "fit-content",
//           }}>
//             <div style={{
//               width: 7, height: 7, borderRadius: "50%",
//               background: "#4f94ff",
//               boxShadow: "0 0 6px rgba(79,148,255,0.7)",
//             }} />
//             <span style={{ color: "#6aadff", fontSize: 12, fontWeight: 500, letterSpacing: 0.3 }}>
//               All-in-one enterprise suite
//             </span>
//           </div>

//           <Title level={2} style={{
//             color: "#ffffff", margin: 0, fontWeight: 800,
//             lineHeight: 1.22, fontSize: 31, letterSpacing: -0.7, marginBottom: 12,
//           }}>
//             Unify your teams,<br />projects & performance.
//           </Title>
//           <Text style={{
//             color: "rgba(255,255,255,0.5)", fontSize: 14,
//             display: "block", lineHeight: 1.65, marginBottom: 36,
//           }}>
//             From project delivery to payroll — everything your<br />
//             enterprise needs in one intelligent platform.
//           </Text>

//           <div style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr",
//             gap: 10,
//           }}>
//             {FEATURES.map((f, i) => (
//               <div key={i} style={{
//                 background: "rgba(255,255,255,0.045)",
//                 border: "1px solid rgba(255,255,255,0.075)",
//                 borderRadius: 11,
//                 padding: "13px 14px",
//                 display: "flex",
//                 alignItems: "flex-start",
//                 gap: 11,
//               }}>
//                 <div style={{
//                   width: 34, height: 34, borderRadius: 8,
//                   background: "color-mix(in srgb, var(--pmt-primary) 18%, transparent)",
//                   border: "1px solid color-mix(in srgb, var(--pmt-primary) 28%, transparent)",
//                   display: "flex", alignItems: "center", justifyContent: "center",
//                   flexShrink: 0,
//                   color: "#5aa8ff",
//                 }}>
//                   {f.icon}
//                 </div>
//                 <div style={{ minWidth: 0 }}>
//                   <div style={{
//                     color: "rgba(255,255,255,0.88)", fontSize: 12.5,
//                     fontWeight: 600, lineHeight: 1.1, marginBottom: 4,
//                   }}>
//                     {f.label}
//                   </div>
//                   <div style={{
//                     color: "rgba(255,255,255,0.36)", fontSize: 11,
//                     lineHeight: 1.45,
//                   }}>
//                     {f.desc}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <div style={{ position: "relative", zIndex: 1 }}>
//           <div style={{
//             borderTop: "1px solid rgba(255,255,255,0.07)",
//             paddingTop: 20,
//             display: "flex", alignItems: "center", gap: 10,
//           }}>
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
//               <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
//             </svg>
//             <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11.5 }}>
//               Enterprise-grade security · Role-based access · Keycloak SSO
//             </Text>
//           </div>
//         </div>
//       </div>

//       {/* ── Right form panel ── */}
//       <div className="pmt-login-form-panel">
//         <div style={{ position: "absolute", top: 20, right: 24 }}>
//           <ThemeToggle />
//         </div>

//         <div style={{ width: "100%", maxWidth: 380 }}>
//           <div style={{ marginBottom: 36 }}>
//             <div style={{
//               width: 50, height: 50, borderRadius: 14,
//               background: "var(--pmt-primary)",
//               display: "flex", alignItems: "center", justifyContent: "center",
//               marginBottom: 22,
//               boxShadow: "0 4px 18px color-mix(in srgb, var(--pmt-primary) 32%, transparent)",
//             }}>
//               <PMTLogo size={28} />
//             </div>
//             <Title level={2} style={{
//               margin: 0, fontWeight: 800, color: "var(--pmt-text)",
//               fontSize: 26, letterSpacing: -0.5,
//             }}>
//               Welcome back
//             </Title>
//             <Text style={{
//               color: "var(--pmt-text-2)", fontSize: 14,
//               marginTop: 6, display: "block", lineHeight: 1.5,
//             }}>
//               Sign in to your PMT workspace to continue.
//             </Text>
//           </div>

//           {error && (
//             <Alert
//               type="error"
//               message={error}
//               showIcon
//               style={{ marginBottom: 20, borderRadius: 8 }}
//               closable
//               onClose={() => setError(null)}
//             />
//           )}

//           <Form onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
//             <Form.Item
//               name="username"
//               label={<span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--pmt-text)" }}>Username</span>}
//               rules={[{ required: true, message: "Please enter your username" }]}
//               style={{ marginBottom: 18 }}
//             >
//               <Input
//                 prefix={<UserOutlined style={{ color: "var(--pmt-text-3)" }} />}
//                 placeholder="Enter your username"
//                 style={{ borderRadius: 9, height: 46 }}
//                 autoComplete="username"
//               />
//             </Form.Item>

//             <Form.Item
//               name="password"
//               label={<span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--pmt-text)" }}>Password</span>}
//               rules={[{ required: true, message: "Please enter your password" }]}
//               style={{ marginBottom: 6 }}
//             >
//               <Input.Password
//                 prefix={<LockOutlined style={{ color: "var(--pmt-text-3)" }} />}
//                 placeholder="Enter your password"
//                 style={{ borderRadius: 9, height: 46 }}
//                 autoComplete="current-password"
//                 iconRender={(visible) =>
//                   visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
//                 }
//               />
//             </Form.Item>

//             <div style={{ textAlign: "right", marginBottom: 8 }}>
//               <Link to="/forgot-password" style={{ color: "var(--pmt-primary)", fontSize: 13, fontWeight: 500 }}>
//                 Forgot password?
//               </Link>
//             </div>

//             <Form.Item style={{ marginTop: 24 }}>
//               <Button
//                 type="primary"
//                 htmlType="submit"
//                 block
//                 loading={loading}
//                 style={{
//                   height: 48, borderRadius: 9,
//                   fontWeight: 700, fontSize: 15,
//                   letterSpacing: 0.2,
//                 }}
//               >
//                 {loading ? "Signing in…" : "Sign In →"}
//               </Button>
//             </Form.Item>
//           </Form>

//           <div style={{
//             borderTop: "1px solid var(--pmt-border)",
//             marginTop: 24, paddingTop: 24,
//             display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
//           }}>
//             <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--pmt-text-3)">
//               <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
//             </svg>
//             <Text style={{ color: "var(--pmt-text-3)", fontSize: 12 }}>
//               Secured by Keycloak SSO
//             </Text>
//           </div>

//           <Text style={{
//             display: "block", textAlign: "center",
//             color: "var(--pmt-text-3)", fontSize: 11.5, marginTop: 20,
//           }}>
//             © 2025 Hackers Infotech
//           </Text>
//         </div>
//       </div>
//     </div>
//   );
// }




import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { post } from '@/services/api';
import { resolveLandingPath } from '@/utils/access';
import { KeyRound, User as UserIcon, Eye, EyeOff, Lock, ArrowRight, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import styles from './Login.module.css';
import logo from '@/assets/hackers-infotech-logo.png';

const SPLASH_HOLD_MS = 1600;

const BrandPanel: React.FC = () => (
  <div className={styles.brandBg}>
    <svg
      className={styles.waveSvg}
      viewBox="0 0 1456 450"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0,320 C260,260 420,380 700,300 C980,220 1140,340 1456,180 L1456,450 L0,450 Z"
        fill="rgba(255,255,255,0.05)"
      />
      <path
        d="M0,360 C300,300 480,410 760,330 C1040,250 1180,370 1456,230 L1456,450 L0,450 Z"
        fill="rgba(255,255,255,0.07)"
      />
      <path
        d="M0,300 C320,410 620,180 940,300 C1140,375 1260,300 1456,340"
        fill="none"
        stroke="rgba(120,170,255,0.55)"
        strokeWidth="2.5"
      />
    </svg>
    <div className={styles.dotsBottomRight} />
  </div>
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setToken, setRefreshToken, setUser, setPermissions } = useAuthStore();
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.isDark);
  const toggle = useThemeStore((s) => s.toggle);

  useEffect(() => {
    const timer = setTimeout(() => setCollapsed(true), SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await post<any>('/auth/token/', { username, password });
      setToken(res.access_token);
      if (res.refresh_token) setRefreshToken(res.refresh_token);

      const { get: apiGet } = await import('@/services/api');
      const me = await apiGet<any>('/users/me/');
      setUser({ ...me, last_login: res.user?.last_login ?? me.last_login ?? null });
      setPermissions(me.permissions ?? []);

      navigate(resolveLandingPath(me, me.permissions ?? []), { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Splash → collapses into left brand panel */}
      <div className={`${styles.splash} ${collapsed ? styles.collapsed : ''}`}>
        <BrandPanel />
        <div className={styles.splashContent}>
          <img src={logo} alt="Hackers InfoTech" className={styles.logoImg} />
          <span className={styles.certifiedBadge}>Chandraprakash Sankar | Founder &amp; CEO</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className={`${styles.formSide} ${collapsed ? styles.visible : ''}`}>
        {/* Theme toggle — top right */}
        <button
          type="button"
          onClick={toggle}
          className={styles.themeToggle}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? 'Light' : 'Dark'}
        </button>

        <div className={styles.cornerDots} />
        <div className={styles.formCard}>
          <div className={styles.iconRow}>
            <div className={styles.dotGrid} />
            <div className={styles.iconCircle}>
              <Lock size={24} />
            </div>
            <div className={styles.dotGrid} />
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Welcome Back!</h2>
            <p className={styles.formSubtitle}>Sign in to your account to continue</p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>Username</label>
              </div>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}><UserIcon size={16} /></span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={styles.input}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className={styles.forgotLink}
                >
                  Forgot?
                </button>
              </div>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon}><KeyRound size={16} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={styles.input}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className={styles.eyeToggle}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.rememberRow}>
              <input
                type="checkbox"
                id="remember-me"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" className={styles.rememberLabel}>Remember me</label>
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {!loading && <ArrowRight size={16} />}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}