import dayjs, { Dayjs } from "dayjs";
import { FollowUpItem, FOLLOWUP_PRIORITIES } from "@/services/followups";

export function parseTime(value: string | null | undefined): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value, ["HH:mm:ss", "HH:mm"], true);
  return parsed.isValid() ? parsed : null;
}

export function formatTimeShort(value: string | null | undefined): string {
  const t = parseTime(value);
  return t ? t.format("h:mm A") : "";
}

export function formatTimeRange(start: string | null, end: string | null): string | null {
  const s = formatTimeShort(start);
  const e = formatTimeShort(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  if (e) return `Until ${e}`;
  return null;
}

export function priorityColor(priority: string): string {
  return FOLLOWUP_PRIORITIES.find((p) => p.value === priority)?.color ?? "#6b7280";
}

export function statusColor(slug: string): string {
  const map: Record<string, string> = {
    planning: "#14B8A6",
    inprogress: "#3B82F6",
    completed: "#10B981",
    cancelled: "#EF4444",
  };
  return map[slug] ?? "#6b7280";
}

/** Event fill: priority tint with status left border feel via single color */
export function eventColor(item: FollowUpItem): string {
  return priorityColor(item.priority || "MEDIUM");
}

export function hasTimedSlot(item: FollowUpItem): boolean {
  return Boolean(item.start_date && item.start_time);
}

export function eventDate(item: FollowUpItem): Dayjs | null {
  if (!item.start_date) return null;
  return dayjs(item.start_date);
}

export function eventStart(item: FollowUpItem): Dayjs | null {
  const d = eventDate(item);
  if (!d) return null;
  const t = parseTime(item.start_time);
  if (!t) return null;
  return d.hour(t.hour()).minute(t.minute()).second(0);
}

export function eventEnd(item: FollowUpItem): Dayjs | null {
  const start = eventStart(item);
  if (!start) return null;
  const t = parseTime(item.end_time);
  if (t) return start.hour(t.hour()).minute(t.minute());
  return start.add(30, "minute");
}

export function itemsOnDate(items: FollowUpItem[], date: Dayjs): FollowUpItem[] {
  return items.filter((i) => {
    if (!i.start_date) return false;
    const start = dayjs(i.start_date).startOf("day");
    const end = i.end_date ? dayjs(i.end_date).startOf("day") : start;
    const current = date.startOf("day");
    return (current.isSame(start) || current.isAfter(start)) && (current.isSame(end) || current.isBefore(end));
  });
}

export function allDayItems(items: FollowUpItem[], date: Dayjs): FollowUpItem[] {
  return itemsOnDate(items, date).filter((i) => !i.start_time);
}

export function timedItems(items: FollowUpItem[], date: Dayjs): FollowUpItem[] {
  return itemsOnDate(items, date).filter((i) => Boolean(i.start_time));
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const HOUR_START = 6;
export const HOUR_END = 22;
export const HOUR_HEIGHT = 52;
