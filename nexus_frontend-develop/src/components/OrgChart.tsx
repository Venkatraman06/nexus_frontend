import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Spin, Empty, Tag, Button, Modal, Tooltip, Space } from "antd";
import {
  TeamOutlined, UserOutlined,
  ZoomInOutlined, ZoomOutOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
  ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import { get } from "@/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrgNode {
  id: string;
  name: string;
  employee_code: string;
  designation: string;
  department: string;
  manager_id: string | null;
  avatar: string | null;
}
interface TreeNode extends OrgNode { children: TreeNode[] }

// ── Layout constants ──────────────────────────────────────────────────────────
const CARD_W    = 158;
const SIBLING_G = 36;
const STEM_H    = 30;
const LINE_CLR  = "#cbd5e1";

// ── Tree helpers ──────────────────────────────────────────────────────────────
function buildSubtree(nodes: OrgNode[], rootId: string): TreeNode {
  const node = nodes.find((n) => n.id === rootId)!;
  return {
    ...node,
    children: nodes
      .filter((n) => n.manager_id === rootId)
      .map((n) => buildSubtree(nodes, n.id)),
  };
}

/** Build subtree but strip children beyond maxDepth (keeps counts intact). */
function buildSubtreeCapped(nodes: OrgNode[], rootId: string, maxDepth: number, depth = 0): TreeNode {
  const node = nodes.find((n) => n.id === rootId)!;
  if (depth >= maxDepth) return { ...node, children: [] };
  return {
    ...node,
    children: nodes
      .filter((n) => n.manager_id === rootId)
      .map((n) => buildSubtreeCapped(nodes, n.id, maxDepth, depth + 1)),
  };
}

function subtreeWidth(node: TreeNode): number {
  if (!node.children.length) return CARD_W;
  const tot = node.children.reduce((s, c) => s + subtreeWidth(c), 0);
  return Math.max(CARD_W, tot + SIBLING_G * (node.children.length - 1));
}

/** Count descendants from the FULL (uncapped) tree. */
function countDescendants(nodes: OrgNode[], nodeId: string): number {
  const directs = nodes.filter((n) => n.manager_id === nodeId);
  return directs.reduce((sum, d) => sum + 1 + countDescendants(nodes, d.id), 0);
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
const PALETTE = [
  "#E53935","#8E24AA","#1E88E5","#00897B",
  "#F4511E","#43A047","#FB8C00","#D81B60",
  "#5E35B1","#039BE5","#00ACC1","#7CB342",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

// ── Node card ─────────────────────────────────────────────────────────────────
function NodeCard({
  node, isRoot = false, isParent = false, reportCount = 0, onNavigate,
}: {
  node: TreeNode | OrgNode;
  isRoot?: boolean;
  isParent?: boolean;
  reportCount?: number;
  onNavigate?: (id: string) => void;
}) {
  const color = avatarColor(node.name);
  const borderColor = isRoot ? "#3b82f6" : isParent ? "#a78bfa" : "#e2e8f0";
  const bgColor     = isRoot ? "#eff6ff" : isParent ? "#f5f3ff" : "#ffffff";
  const shadow      = isRoot
    ? "0 4px 16px rgba(59,130,246,0.20)"
    : isParent
    ? "0 4px 16px rgba(167,139,250,0.18)"
    : "0 2px 8px rgba(0,0,0,0.07)";

  return (
    <div
      onClick={() => onNavigate?.(node.id)}
      title={node.designation ? `${node.name} · ${node.designation}` : node.name}
      style={{
        width: CARD_W, flexShrink: 0,
        background: bgColor, borderRadius: 12,
        border: `2px solid ${borderColor}`,
        boxShadow: shadow,
        padding: "16px 14px 12px",
        display: "flex", flexDirection: "column", alignItems: "center",
        cursor: onNavigate ? "pointer" : "default",
        position: "relative",
        transition: "transform 0.15s, box-shadow 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = isRoot
          ? "0 10px 28px rgba(59,130,246,0.28)"
          : isParent
          ? "0 10px 28px rgba(167,139,250,0.26)"
          : "0 8px 22px rgba(0,0,0,0.13)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "";
        el.style.boxShadow = shadow;
      }}
    >
      {/* Report count badge (non-root, non-parent) */}
      {reportCount > 0 && !isRoot && !isParent && (
        <div style={{
          position: "absolute", top: -9, right: -9,
          background: "#64748b", color: "#fff",
          borderRadius: "50%", width: 22, height: 22,
          fontSize: 11, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          border: "2px solid #fff",
        }} title={`${reportCount} reports`}>{reportCount}</div>
      )}

      {/* Role chip — top */}
      {(isRoot || isParent) && (
        <div style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          background: isRoot ? "#3b82f6" : "#7c3aed",
          color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 8px", borderRadius: 20,
          whiteSpace: "nowrap", letterSpacing: 0.4,
          boxShadow: `0 2px 6px ${isRoot ? "rgba(59,130,246,0.4)" : "rgba(124,58,237,0.35)"}`,
        }}>
          {isRoot ? "▼ Current" : "▲ Manager"}
        </div>
      )}

      {/* Avatar */}
      {node.avatar ? (
        <img src={node.avatar} alt={node.name}
          style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2.5px solid #e2e8f0", marginBottom: 10, marginTop: 4 }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: "50%", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 17, marginBottom: 10, marginTop: 4,
          border: "2.5px solid rgba(255,255,255,0.7)",
          boxShadow: `0 2px 10px ${color}66`, flexShrink: 0,
        }}>{initials(node.name)}</div>
      )}

      {/* Name */}
      <div style={{
        fontSize: 12, fontWeight: 700, color: "#0f172a",
        textAlign: "center", lineHeight: 1.35, marginBottom: 4,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden", width: "100%",
      }}>{node.name}</div>

      {/* Employee code */}
      {node.employee_code && (
        <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", marginBottom: 5 }}>
          {node.employee_code}
        </div>
      )}

      {/* Designation pill */}
      {node.designation && (
        <div style={{
          fontSize: 10, color: isRoot ? "#1d4ed8" : isParent ? "#5b21b6" : "#64748b",
          textAlign: "center", maxWidth: "100%",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          background: isRoot ? "#dbeafe" : isParent ? "#ede9fe" : "#f1f5f9",
          padding: "2px 8px", borderRadius: 6,
        }}>{node.designation}</div>
      )}

      {/* "Has N reports" hint on leaf cards in focused mode */}
      {reportCount > 0 && !isRoot && !isParent && (
        <div style={{
          marginTop: 6, fontSize: 10, color: "#94a3b8",
          display: "flex", alignItems: "center", gap: 3,
        }}>
          <TeamOutlined style={{ fontSize: 9 }} />
          {reportCount} report{reportCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ── Subtree renderer (full mode) ──────────────────────────────────────────────
function SubTree({
  node, isRoot = false, allNodes, onNavigate,
}: {
  node: TreeNode;
  isRoot?: boolean;
  allNodes: OrgNode[];
  onNavigate?: (id: string) => void;
}) {
  const sw = subtreeWidth(node);
  const desc = countDescendants(allNodes, node.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: sw }}>
      <NodeCard
        node={node}
        isRoot={isRoot}
        reportCount={isRoot ? 0 : desc}
        onNavigate={onNavigate}
      />

      {node.children.length > 0 && (
        <>
          <div style={{ width: 2, height: STEM_H, background: LINE_CLR, flexShrink: 0 }} />
          <div style={{ position: "relative", width: sw }}>
            {node.children.length > 1 && (() => {
              const fW = subtreeWidth(node.children[0]);
              const lW = subtreeWidth(node.children[node.children.length - 1]);
              return (
                <div style={{
                  position: "absolute", top: 0,
                  left: fW / 2, width: sw - fW / 2 - lW / 2,
                  height: 2, background: LINE_CLR,
                }} />
              );
            })()}
            <div style={{ display: "flex", gap: SIBLING_G }}>
              {node.children.map((child) => (
                <div key={child.id} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  width: subtreeWidth(child),
                }}>
                  <div style={{ width: 2, height: STEM_H, background: LINE_CLR, flexShrink: 0 }} />
                  <SubTree node={child} allNodes={allNodes} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Focused mode renderer: Manager → Root → Direct Reports only ───────────────
function FocusedTree({
  root, parent, allNodes, onNavigate,
}: {
  root: TreeNode;
  parent: OrgNode | null;
  allNodes: OrgNode[];
  onNavigate?: (id: string) => void;
}) {
  const directReports = root.children;

  // Width of the children row
  const rowW = directReports.length > 0
    ? directReports.length * CARD_W + (directReports.length - 1) * SIBLING_G
    : CARD_W;
  const totalW = Math.max(CARD_W, rowW);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

      {/* ── Manager (parent) ── */}
      {parent && (
        <>
          {/* Section label */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: "#7c3aed",
            letterSpacing: 0.5, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <ArrowUpOutlined style={{ fontSize: 10 }} /> Reports To
          </div>
          <NodeCard
            node={{ ...parent, children: [] }}
            isParent
            onNavigate={onNavigate}
          />
          <div style={{ width: 2, height: STEM_H + 4, background: LINE_CLR }} />
        </>
      )}

      {/* ── Root (current employee) ── */}
      <NodeCard node={root} isRoot onNavigate={onNavigate} />

      {/* ── Direct reports ── */}
      {directReports.length > 0 && (
        <>
          <div style={{ width: 2, height: STEM_H + 4, background: LINE_CLR }} />

          {/* Section label */}
          <div style={{
            fontSize: 11, fontWeight: 600, color: "#1d4ed8",
            letterSpacing: 0.5, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <ArrowDownOutlined style={{ fontSize: 10 }} /> Direct Reports ({directReports.length})
          </div>

          {/* Children row */}
          <div style={{ position: "relative", width: totalW }}>
            {directReports.length > 1 && (
              <div style={{
                position: "absolute", top: 0,
                left: CARD_W / 2, width: totalW - CARD_W,
                height: 2, background: LINE_CLR,
              }} />
            )}
            <div style={{ display: "flex", gap: SIBLING_G }}>
              {directReports.map((child) => {
                const childReports = countDescendants(allNodes, child.id);
                return (
                  <div key={child.id} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    width: CARD_W,
                  }}>
                    <div style={{ width: 2, height: STEM_H, background: LINE_CLR, flexShrink: 0 }} />
                    <NodeCard
                      node={child}
                      reportCount={childReports}
                      onNavigate={onNavigate}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {directReports.length === 0 && (
        <div style={{
          marginTop: 14, fontSize: 12, color: "#94a3b8",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <UserOutlined /> No direct reports
        </div>
      )}
    </div>
  );
}

// ── Zoom toolbar ──────────────────────────────────────────────────────────────
function ZoomBar({
  zoom, onZoomIn, onZoomOut, onReset, onFullscreen, isFullscreen,
}: {
  zoom: number; onZoomIn: () => void; onZoomOut: () => void;
  onReset: () => void; onFullscreen?: () => void; isFullscreen?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 8, padding: "4px 10px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    }}>
      <Tooltip title="Zoom out">
        <Button size="small" type="text" icon={<ZoomOutOutlined />} onClick={onZoomOut} disabled={zoom <= 0.3} />
      </Tooltip>
      <div
        style={{ minWidth: 44, textAlign: "center", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", padding: "0 2px" }}
        onClick={onReset} title="Reset zoom"
      >
        {Math.round(zoom * 100)}%
      </div>
      <Tooltip title="Zoom in">
        <Button size="small" type="text" icon={<ZoomInOutlined />} onClick={onZoomIn} disabled={zoom >= 2.5} />
      </Tooltip>
      <div style={{ width: 1, height: 16, background: "#e2e8f0", margin: "0 2px" }} />
      <Tooltip title="Reset"><Button size="small" type="text" icon={<ReloadOutlined />} onClick={onReset} /></Tooltip>
      {onFullscreen && (
        <>
          <div style={{ width: 1, height: 16, background: "#e2e8f0", margin: "0 2px" }} />
          <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            <Button size="small" type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={onFullscreen}
            />
          </Tooltip>
        </>
      )}
    </div>
  );
}

// ── Zoomable canvas ───────────────────────────────────────────────────────────
function ChartCanvas({
  children, zoom, height,
}: { children: React.ReactNode; zoom: number; height: number | string }) {
  return (
    <div style={{
      overflow: "auto", height,
      borderRadius: 12, border: "1px solid #e8edf3",
      background: "#f8fafc",
      backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    }}>
      <div style={{
        display: "inline-block", minWidth: "100%",
        padding: "40px 32px 36px",
        transformOrigin: "top center",
        zoom,
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OrgChart({
  rootId, onNavigate, height = 560, focusedMode = false,
}: {
  rootId?: string;
  onNavigate?: (id: string) => void;
  height?: number;
  focusedMode?: boolean;
}) {
  const [zoom, setZoom]             = useState(focusedMode ? 1 : 0.85);
  const [fsZoom, setFsZoom]         = useState(0.8);
  const [fullscreen, setFullscreen] = useState(false);

  const step = (set: typeof setZoom, d: number) =>
    () => set((z) => Math.min(2.5, Math.max(0.3, +((z + d).toFixed(2)))));

  const { data, isLoading } = useQuery<{ nodes: OrgNode[]; parent: OrgNode | null }>({
    queryKey: ["org-tree", rootId ?? "all"],
    queryFn:  () => get(`/employees/org-tree/${rootId ? `?root=${rootId}` : ""}`),
    staleTime: 60_000,
  });

  const allNodes = data?.nodes ?? [];
  const apiParent = data?.parent ?? null;

  const { tree, directCount, totalCount } = useMemo(() => {
    if (!allNodes.length) return { tree: [], directCount: 0, totalCount: 0 };

    if (rootId) {
      if (!allNodes.some((n) => n.id === rootId))
        return { tree: [], directCount: 0, totalCount: 0 };

      if (focusedMode) {
        // Only depth=1 (direct reports), but keep full allNodes for counts
        const capped = buildSubtreeCapped(allNodes, rootId, 1);
        return {
          tree: [capped],
          directCount: capped.children.length,
          totalCount: countDescendants(allNodes, rootId),
        };
      }

      const full = buildSubtree(allNodes, rootId);
      return {
        tree: [full],
        directCount: full.children.length,
        totalCount: countDescendants(allNodes, rootId),
      };
    }

    const idSet = new Set(allNodes.map((n) => n.id));
    const roots = allNodes
      .filter((n) => !n.manager_id || !idSet.has(n.manager_id))
      .map((n) => buildSubtree(allNodes, n.id));
    return { tree: roots, directCount: 0, totalCount: 0 };
  }, [data, rootId, focusedMode]);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: "#94a3b8", fontSize: 13 }}>Loading hierarchy…</div>
      </div>
    );
  }

  if (!tree.length) {
    return (
      <Empty
        image={<TeamOutlined style={{ fontSize: 52, color: "#cbd5e1" }} />}
        description={
          <span style={{ color: "#94a3b8", fontSize: 13 }}>
            {rootId ? "No reporting structure found" : "No hierarchy configured"}
          </span>
        }
        style={{ padding: "48px 0" }}
      />
    );
  }

  const renderContent = (nav?: (id: string) => void, z = zoom) => (
    <ChartCanvas zoom={z} height={height}>
      {focusedMode && rootId ? (
        <FocusedTree
          root={tree[0]}
          parent={apiParent}
          allNodes={allNodes}
          onNavigate={nav}
        />
      ) : (
        tree.map((root, i) => (
          <div key={root.id} style={{ marginTop: i > 0 ? 48 : 0 }}>
            <SubTree
              node={root}
              isRoot={tree.length === 1}
              allNodes={allNodes}
              onNavigate={nav}
            />
          </div>
        ))
      )}
    </ChartCanvas>
  );

  return (
    <div>
      {/* Stats */}
      {rootId && (
        <div style={{
          display: "flex", gap: 10, marginBottom: 12,
          padding: "10px 14px", background: "#f8fafc",
          borderRadius: 8, border: "1px solid #e8edf3", flexWrap: "wrap",
        }}>
          <Tag icon={<UserOutlined />}   color="blue">Direct Reports: {directCount}</Tag>
          <Tag icon={<TeamOutlined />} color="purple">Total in Team: {totalCount}</Tag>
          {apiParent && (
            <Tag color="volcano">Reports to: {apiParent.name}</Tag>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <ZoomBar
          zoom={zoom}
          onZoomIn={step(setZoom, 0.15)}
          onZoomOut={step(setZoom, -0.15)}
          onReset={() => setZoom(focusedMode ? 1 : 0.85)}
          onFullscreen={() => setFullscreen(true)}
        />
      </div>

      {renderContent(onNavigate, zoom)}

      {/* Legend */}
      <div style={{ marginTop: 10, display: "flex", gap: 20, fontSize: 11, color: "#94a3b8", flexWrap: "wrap" }}>
        {focusedMode ? (
          <>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", marginRight: 4, verticalAlign: "middle" }} />Purple = manager</span>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginRight: 4, verticalAlign: "middle" }} />Blue = current employee</span>
            <span>Badge = reports under that person</span>
          </>
        ) : (
          <>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginRight: 4, verticalAlign: "middle" }} />Blue border = root</span>
            <span>Badge = total reports under that person</span>
          </>
        )}
        <span>Click any card → open profile</span>
      </div>

      {/* Fullscreen modal */}
      <Modal
        open={fullscreen}
        onCancel={() => setFullscreen(false)}
        footer={null}
        width="96vw"
        style={{ top: 16, maxWidth: "none" }}
        styles={{ body: { padding: 0 }, content: { borderRadius: 14, overflow: "hidden" } }}
        closeIcon={<FullscreenExitOutlined style={{ fontSize: 18, color: "#475569" }} />}
        destroyOnClose={false}
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 40 }}>
            <Space>
              <TeamOutlined style={{ color: "#3b82f6", fontSize: 18 }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                {rootId && focusedMode ? "Reporting Structure" : rootId ? "Team Hierarchy" : "Organisation Chart"}
              </span>
              {rootId && (
                <Space size={6}>
                  <Tag color="blue"   style={{ fontSize: 11 }}>Direct: {directCount}</Tag>
                  <Tag color="purple" style={{ fontSize: 11 }}>Total: {totalCount}</Tag>
                  {apiParent && <Tag color="volcano" style={{ fontSize: 11 }}>Reports to: {apiParent.name}</Tag>}
                </Space>
              )}
            </Space>
            <ZoomBar
              zoom={fsZoom}
              onZoomIn={step(setFsZoom, 0.15)}
              onZoomOut={step(setFsZoom, -0.15)}
              onReset={() => setFsZoom(0.8)}
              isFullscreen
              onFullscreen={() => setFullscreen(false)}
            />
          </div>
        }
      >
        {renderContent(
          (id) => { setFullscreen(false); onNavigate?.(id); },
          fsZoom,
        )}
        {/* re-render canvas with fs zoom and full height */}
        <style>{`.org-fs-canvas { height: calc(100vh - 120px) !important; }`}</style>
      </Modal>
    </div>
  );
}
