// import { useEffect } from "react";
// import { ConfigProvider, theme } from "antd";
// import { useThemeStore, applyThemeToDocument } from "@/store/theme";

// const lightTokens = {
//   colorPrimary: "#1677ff",
//   colorSuccess: "#52c41a",
//   colorWarning: "#faad14",
//   colorError: "#ff4d4f",
//   borderRadius: 8,
//   borderRadiusLG: 12,
//   fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
//   fontSize: 14,
//   colorBgContainer: "#ffffff",
//   colorBgLayout: "#f5f7fa",
//   colorBorder: "#e8edf3",
//   colorText: "#1a2332",
//   colorTextSecondary: "#5a6a7e",
//   boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
// };

// const darkTokens = {
//   ...lightTokens,
//   colorBgContainer: "#1a2236",
//   colorBgLayout: "#0f1419",
//   colorBgElevated: "#1e2a3f",
//   colorBorder: "#2a3548",
//   colorText: "#e8edf3",
//   colorTextSecondary: "#8c9ab0",
//   colorFillAlter: "#243044",
//   colorFillSecondary: "#2a3548",
//   boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
// };

// const componentTokens = {
//   Button: { borderRadius: 8, fontWeight: 500 },
//   Table: {
//     borderRadius: 12,
//     headerBg: undefined as string | undefined,
//     rowHoverBg: undefined as string | undefined,
//   },
//   Card: { borderRadius: 12 },
//   Input: { borderRadius: 8 },
//   Select: { borderRadius: 8 },
//   Modal: { borderRadius: 12 },
//   Menu: {
//     itemBorderRadius: 8,
//     itemSelectedBg: "#1677ff",
//     itemSelectedColor: "#ffffff",
//     darkItemBg: "#0d1b2e",
//     darkItemHoverBg: "#1a2d47",
//     darkItemSelectedBg: "#1677ff",
//   },
// };

// export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
//   const isDark = useThemeStore((s) => s.isDark);

//   useEffect(() => {
//     applyThemeToDocument(isDark);
//   }, [isDark]);

//   useEffect(() => {
//     const stored = useThemeStore.getState().isDark;
//     applyThemeToDocument(stored);
//   }, []);

//   return (
//     <ConfigProvider
//       theme={{
//         algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
//         token: isDark ? darkTokens : lightTokens,
//         components: {
//           ...componentTokens,
//           Table: {
//             ...componentTokens.Table,
//             headerBg: isDark ? "#1a2236" : "#f8fafc",
//             rowHoverBg: isDark ? "#243044" : "#f0f6ff",
//           },
//         },
//       }}
//     >
//       {children}
//     </ConfigProvider>
//   );
// }
import { useEffect } from "react";
import { ConfigProvider, theme } from "antd";
import { useThemeStore, applyThemeToDocument, getPersistedIsDark } from "@/store/theme";

const lightTokens = {
  colorPrimary: "#1677ff",
  colorSuccess: "#52c41a",
  colorWarning: "#faad14",
  colorError: "#ff4d4f",
  borderRadius: 8,
  borderRadiusLG: 12,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 14,
  colorBgContainer: "#ffffff",
  colorBgLayout: "#f5f7fa",
  colorBorder: "#e8edf3",
  colorText: "#1a2332",
  colorTextSecondary: "#5a6a7e",
};

const darkTokens = {
  ...lightTokens,
  colorBgContainer: "#1a2236",
  colorBgLayout: "#0f1419",
  colorBgElevated: "#1e2a3f",
  colorBorder: "#2a3548",
  colorText: "#e8edf3",
  colorTextSecondary: "#8c9ab0",
  colorFillAlter: "#243044",
  colorFillSecondary: "#2a3548",
};

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useThemeStore((s) => s.isDark);

  // Apply CSS variables on every change
  useEffect(() => {
    applyThemeToDocument(isDark);
  }, [isDark]);

  // Apply immediately on first render using persisted value
  // (before Zustand rehydration completes)
  useEffect(() => {
    applyThemeToDocument(getPersistedIsDark());
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDark ? darkTokens : lightTokens,
        components: {
          Button:  { borderRadius: 8, fontWeight: 500 },
          Card:    { borderRadius: 12 },
          Input:   { borderRadius: 8 },
          Select:  { borderRadius: 8 },
          Modal:   { borderRadius: 12 },
          Table: {
            borderRadius: 12,
            headerBg:   isDark ? "#1a2236" : "#f8fafc",
            rowHoverBg: isDark ? "#243044" : "#f0f6ff",
          },
          Menu: {
            itemBorderRadius:    8,
            itemSelectedBg:      "#1677ff",
            itemSelectedColor:   "#ffffff",
            darkItemBg:          "#0d1b2e",
            darkItemHoverBg:     "#1a2d47",
            darkItemSelectedBg:  "#1677ff",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}