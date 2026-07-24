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

const FONT_STACK = "'Inter', 'Roboto', 'Google Sans', 'Product Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const lightTokens = {
  colorPrimary: "#1a73e8",
  colorLink: "#1a73e8",
  colorSuccess: "#188038",
  colorWarning: "#e37400",
  colorError: "#c5221f",
  borderRadius: 10,
  borderRadiusLG: 14,
  fontFamily: FONT_STACK,
  fontSize: 14,
  colorBgContainer: "#ffffff",
  colorBgLayout: "#f8f9fa",
  colorBorder: "#dadce0",
  colorText: "#202124",
  colorTextSecondary: "#5f6368",
  colorTextTertiary: "#80868b",
  colorFillAlter: "#f1f3f4",
  colorFillSecondary: "#e8eaed",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
  boxShadowSecondary: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
};

const darkTokens = {
  ...lightTokens,
  colorPrimary: "#8ab4f8",
  colorLink: "#8ab4f8",
  colorBgContainer: "#1a2236",
  colorBgLayout: "#0f1419",
  colorBgElevated: "#1e2a3f",
  colorBorder: "#3c4043",
  colorText: "#e8eaed",
  colorTextSecondary: "#9aa0a6",
  colorTextTertiary: "#80868b",
  colorFillAlter: "#243044",
  colorFillSecondary: "#2a3548",
  boxShadow: "0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px 0 rgba(0,0,0,0.12)",
  boxShadowSecondary: "0 4px 6px -1px rgba(0,0,0,0.25), 0 2px 4px -1px rgba(0,0,0,0.15)",
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
          Button:  { borderRadius: 10, fontWeight: 500, controlHeight: 36 },
          Card:    { borderRadius: 14 },
          Input:   { borderRadius: 10, controlHeight: 36 },
          Select:  { borderRadius: 10, controlHeight: 36 },
          Modal:   { borderRadius: 14 },
          Table: {
            borderRadius: 14,
            headerBg:   isDark ? "#1a2236" : "#f1f3f4",
            rowHoverBg: isDark ? "#243044" : "#e8f0fe",
          },
          Menu: {
            itemBorderRadius:    10,
            itemSelectedBg:      "#1a73e8",
            itemSelectedColor:   "#ffffff",
            darkItemBg:          "#0f172a",
            darkItemHoverBg:     "#1e293b",
            darkItemSelectedBg:  "#1a73e8",
          },
          Tag: {
            borderRadius:     6,
            colorError:       "#c5221f",
            colorErrorBg:     "#fce8e6",
            colorErrorBorder: "#f5c2c0",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}