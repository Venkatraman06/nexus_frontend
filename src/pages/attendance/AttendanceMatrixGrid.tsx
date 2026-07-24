import { useMemo } from "react";
import { Spin, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { AttendanceRow, STATUS_CELL, STATUS_STYLE } from "./attendanceConstants";
import "./attendanceMatrix.css";

const { Text } = Typography;

export interface MatrixEmployeeRow {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  presentCount: number;
  dayStatus: Map<string, AttendanceRow>;
}

export function buildMatrixRows(rows: AttendanceRow[]): MatrixEmployeeRow[] {
  const byEmp = new Map<string, MatrixEmployeeRow>();

  for (const row of rows) {
    let entry = byEmp.get(row.employee_id);
    if (!entry) {
      entry = {
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        employee_code: row.employee_code,
        department: row.department,
        presentCount: 0,
        dayStatus: new Map(),
      };
      byEmp.set(row.employee_id, entry);
    }
    entry.dayStatus.set(row.date, row);
    if (row.status === "PRESENT" || row.status === "WFH") {
      entry.presentCount += 1;
    }
  }

  return Array.from(byEmp.values()).sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name),
  );
}

function MatrixCell({
  row,
  date,
  onClick,
}: {
  row: AttendanceRow | undefined;
  date: Dayjs;
  onClick: () => void;
}) {
  const isFuture = date.isAfter(dayjs(), "day");
  const status = row?.status ?? (date.day() === 0 || date.day() === 6 ? "WEEKEND" : "NOT_MARKED");
  const cfg = STATUS_CELL[status] ?? STATUS_CELL.NOT_MARKED;
  const label = STATUS_STYLE[status]?.label ?? status;

  const tooltip = row
    ? `${label}${row.check_in ? ` · In ${row.check_in}` : ""}${row.check_out ? ` · Out ${row.check_out}` : ""}`
    : isFuture ? "Future date" : label;

  const bg = isFuture && !cfg.code ? "var(--pmt-surface-2)" : cfg.bg;
  const showCorner = row?.status === "WFH";
  const showLateCorner = row?.status === "PRESENT" && row.check_in && row.check_in > "09:30";

  return (
    <td
      className="pmt-att-matrix-cell"
      style={{ background: bg }}
      onClick={onClick}
      title={tooltip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {cfg.code && (
        <span className="pmt-att-matrix-cell-code" style={{ color: cfg.textColor }}>
          {cfg.code}
        </span>
      )}
      {cfg.showInfo && (
        <span className="pmt-att-matrix-cell-info" aria-hidden>i</span>
      )}
      {showCorner && (
        <span className="pmt-att-matrix-cell-corner pmt-att-matrix-cell-corner--wfh" aria-hidden />
      )}
      {showLateCorner && (
        <span className="pmt-att-matrix-cell-corner pmt-att-matrix-cell-corner--late" aria-hidden />
      )}
    </td>
  );
}

export default function AttendanceMatrixGrid({
  month,
  rows,
  loading,
  onCellClick,
}: {
  month: Dayjs;
  rows: MatrixEmployeeRow[];
  loading: boolean;
  onCellClick: (employeeId: string, date: string) => void;
}) {
  const days = useMemo(() => {
    const start = month.startOf("month");
    const count = month.daysInMonth();
    return Array.from({ length: count }, (_, i) => start.add(i, "day"));
  }, [month]);

  if (loading) {
    return (
      <div className="pmt-att-matrix-empty">
        <Spin size="large" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="pmt-att-matrix-empty">
        <Text type="secondary">No employees match your search for {month.format("MMMM YYYY")}.</Text>
      </div>
    );
  }

  return (
    <div className="pmt-att-matrix-scroll">
      <table className="pmt-att-matrix">
        <thead>
          <tr>
            <th className="pmt-att-matrix-sticky" rowSpan={2} style={{ textAlign: "left", paddingLeft: 12 }}>
              <span className="pmt-att-matrix-section-label">Employee name</span>
            </th>
            <th className="pmt-att-matrix-sticky-2" rowSpan={2}>P</th>
            <th colSpan={days.length} style={{ textAlign: "left", paddingLeft: 8 }}>
              <span className="pmt-att-matrix-section-label">Attendance</span>
            </th>
          </tr>
          <tr>
            {days.map((d) => (
              <th key={d.format("YYYY-MM-DD")} className="pmt-att-matrix-day-head">
                <span className="pmt-att-matrix-day-num">{d.format("DD")}</span>
                <span className="pmt-att-matrix-day-dow">{d.format("ddd")}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((emp) => (
            <tr key={emp.employee_id}>
              <td className="pmt-att-matrix-sticky">
                <div className="pmt-att-matrix-emp-name">
                  {emp.employee_name}{" "}
                  <span className="pmt-att-matrix-emp-code">#{emp.employee_code}</span>
                </div>
                {emp.department && (
                  <div className="pmt-att-matrix-emp-meta">{emp.department}</div>
                )}
              </td>
              <td className="pmt-att-matrix-sticky-2">{emp.presentCount}</td>
              {days.map((d) => {
                const iso = d.format("YYYY-MM-DD");
                const dayRow = emp.dayStatus.get(iso);
                return (
                  <MatrixCell
                    key={iso}
                    row={dayRow}
                    date={d}
                    onClick={() => onCellClick(emp.employee_id, iso)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AttendanceLegend() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
      {Object.entries(STATUS_STYLE).map(([key, s]) => {
        const cell = STATUS_CELL[key];
        if (!cell?.code && key !== "WEEKEND" && key !== "NOT_MARKED") return null;
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 4,
              background: cell?.bg ?? s.bg,
              border: `1px solid ${s.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12, color: cell?.textColor ?? s.color,
            }}>
              {cell?.code || "—"}
            </div>
            <Text style={{ fontSize: 13 }}>{s.label}</Text>
            {cell?.showInfo && <InfoCircleOutlined style={{ color: "#2563eb", fontSize: 12 }} />}
          </div>
        );
      })}
      <Text type="secondary" style={{ fontSize: 11 }}>
        Blue corner = WFH · Orange corner = late check-in
      </Text>
    </div>
  );
}
