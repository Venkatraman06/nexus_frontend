import dayjs, { Dayjs } from "dayjs";

export interface AttendanceRow {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  division: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  working_hours: number;
  shift_name: string | null;
}

export const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  PRESENT:    { color: "var(--pmt-success)", bg: "rgba(22, 163, 74, 0.15)", label: "Present"    },
  WFH:        { color: "var(--pmt-primary)", bg: "rgba(37, 99, 235, 0.15)", label: "WFH"        },
  ABSENT:     { color: "var(--pmt-danger)", bg: "var(--pmt-danger-bg)", label: "Absent"     },
  HALF_DAY:   { color: "var(--pmt-warning)", bg: "rgba(217, 119, 6, 0.15)", label: "Half Day"   },
  ON_LEAVE:   { color: "#7c3aed", bg: "rgba(124, 58, 237, 0.15)", label: "On Leave"   },
  HOLIDAY:    { color: "#0d9488", bg: "rgba(13, 148, 136, 0.15)", label: "Holiday"    },
  WEEKEND:    { color: "var(--pmt-text-3)", bg: "var(--pmt-surface-2)", label: "Weekend"    },
  NOT_MARKED: { color: "var(--pmt-text-3)", bg: "var(--pmt-surface)", label: "Not Marked" },
};

/** Single-letter codes shown in the monthly matrix cells */
export const STATUS_CELL: Record<string, { code: string; textColor: string; bg: string; showInfo?: boolean }> = {
  PRESENT:    { code: "P", textColor: "var(--pmt-success)", bg: "var(--pmt-surface)" },
  WFH:        { code: "P", textColor: "var(--pmt-primary)", bg: "rgba(37, 99, 235, 0.15)" },
  ABSENT:     { code: "A", textColor: "var(--pmt-danger)", bg: "var(--pmt-danger-bg)" },
  HALF_DAY:   { code: "H", textColor: "var(--pmt-warning)", bg: "rgba(217, 119, 6, 0.15)" },
  ON_LEAVE:   { code: "L", textColor: "#7c3aed", bg: "var(--pmt-surface)", showInfo: true },
  HOLIDAY:    { code: "H", textColor: "#0d9488", bg: "rgba(13, 148, 136, 0.15)" },
  WEEKEND:    { code: "",  textColor: "var(--pmt-text-3)", bg: "var(--pmt-surface-2)" },
  NOT_MARKED: { code: "",  textColor: "var(--pmt-text-3)", bg: "var(--pmt-surface)" },
};

export const MATRIX_LEGEND = [
  { code: "P", label: "Present", color: "#374151" },
  { code: "P", label: "Work From Home", color: "#2563eb" },
  { code: "H", label: "Holiday / Half Day", color: "#0d9488" },
  { code: "L", label: "On Leave", color: "#374151" },
  { code: "A", label: "Absent", color: "#dc2626" },
];

import { API_BASE } from "@/constants/api";

export function downloadAttendanceExport(year: number, month: number) {
  const token = localStorage.getItem("kc_access_token");
  const url = `${API_BASE}/attendance/export/?year=${year}&month=${month}`;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => r.blob())
    .then((blob) => {
      const link = document.createElement("a");
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${year}_${pad(month)}_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}`;
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_report_${ts}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
}

export function monthRange(month: Dayjs): [Dayjs, Dayjs] {
  return [month.startOf("month"), month.endOf("month")];
}

export function formatMonthLabel(month: Dayjs) {
  return month.format("MMMM YYYY");
}

export const todayEnd = () => dayjs().endOf("day");
