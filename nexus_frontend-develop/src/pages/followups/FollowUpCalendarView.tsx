import { useMemo, useState } from "react";
import { Button, Segmented, Typography, Empty, Spin } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { FollowUpItem } from "@/services/followups";
import {
  WEEKDAYS, HOUR_START, HOUR_END, HOUR_HEIGHT,
  itemsOnDate, allDayItems, timedItems,
  eventStart, eventEnd, eventColor, formatTimeShort,
} from "./followupCalendarUtils";

dayjs.extend(isoWeek);

const { Text } = Typography;
const BORDER = "1px solid #dadce0";
const MAX_MONTH_EVENTS = 3;
type CalendarMode = "day" | "week" | "month";

function useHourSlots() {
  return useMemo(() => {
    const h: number[] = [];
    for (let i = HOUR_START; i <= HOUR_END; i++) h.push(i);
    return h;
  }, []);
}

function TimedEventBlock({
  item, onSelect,
}: { item: FollowUpItem; onSelect: (item: FollowUpItem) => void }) {
  const start = eventStart(item);
  const end = eventEnd(item);
  if (!start || !end) return null;

  const topMin = start.hour() * 60 + start.minute() - HOUR_START * 60;
  const durMin = Math.max(end.diff(start, "minute"), 25);
  const top = (topMin / 60) * HOUR_HEIGHT;
  const height = Math.max((durMin / 60) * HOUR_HEIGHT - 2, 22);
  const color = eventColor(item);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      style={{
        position: "absolute",
        left: 4,
        right: 4,
        top: top + 1,
        height,
        border: "none",
        borderRadius: 6,
        padding: "6px 10px",
        textAlign: "left",
        cursor: "pointer",
        background: color,
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        zIndex: 1,
      }}
    >
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
      <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.95 }}>
        {start.format("h:mm")} – {end.format("h:mm A")}
      </div>
    </button>
  );
}

function HourLabels({ hours }: { hours: number[] }) {
  return (
    <div>
      {hours.map((h) => (
        <div
          key={h}
          style={{
            height: HOUR_HEIGHT,
            fontSize: 10,
            color: "#70757a",
            textAlign: "right",
            paddingRight: 8,
            paddingTop: 2,
            borderTop: h > HOUR_START ? BORDER : undefined,
          }}
        >
          {dayjs().hour(h).minute(0).format("h A")}
        </div>
      ))}
    </div>
  );
}

function EventPill({
  item, compact, onClick,
}: { item: FollowUpItem; compact?: boolean; onClick: () => void }) {
  const color = eventColor(item);
  const time = item.start_time ? formatTimeShort(item.start_time) : null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={item.title}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "none",
        borderRadius: 4,
        padding: compact ? "1px 6px" : "2px 8px",
        marginBottom: 2,
        fontSize: compact ? 11 : 12,
        fontWeight: 500,
        cursor: "pointer",
        background: color,
        color: "#fff",
        borderLeft: `3px solid ${color}`,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: compact ? "18px" : "20px",
      }}
    >
      {time && <span style={{ opacity: 0.85, marginRight: 4 }}>{time}</span>}
      {item.title}
    </button>
  );
}

function MonthView({
  cursor, items, onSelect,
}: { cursor: Dayjs; items: FollowUpItem[]; onSelect: (item: FollowUpItem) => void }) {
  const weeks = useMemo(() => {
    const start = cursor.startOf("month").startOf("week");
    const end = cursor.endOf("month").endOf("week");
    const days: Dayjs[] = [];
    let d = start;
    while (d.isBefore(end) || d.isSame(end, "day")) {
      days.push(d);
      d = d.add(1, "day");
    }
    const rows: Dayjs[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const today = dayjs();

  return (
    <div style={{ border: BORDER, borderRadius: 8, overflow: "hidden", background: "var(--bms-surface)" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: BORDER, background: "var(--bms-surface-2)",
      }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#70757a" }}>
            {w.toUpperCase()}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minHeight: 108, borderBottom: wi < weeks.length - 1 ? BORDER : undefined }}>
          {week.map((day) => {
            const inMonth = day.month() === cursor.month();
            const isToday = day.isSame(today, "day");
            const dayItems = itemsOnDate(items, day);
            const visible = dayItems.slice(0, MAX_MONTH_EVENTS);
            const more = dayItems.length - visible.length;
            return (
              <div
                key={day.format("YYYY-MM-DD")}
                style={{
                  borderRight: day.day() < 6 ? BORDER : undefined,
                  padding: "4px 6px 6px",
                  background: inMonth ? "var(--bms-surface)" : "var(--bms-surface-2)",
                  opacity: inMonth ? 1 : 0.55,
                  verticalAlign: "top",
                }}
              >
                <div style={{ textAlign: "right", marginBottom: 4 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: "50%",
                    fontSize: 12, fontWeight: isToday ? 600 : 400,
                    background: isToday ? "#1a73e8" : "transparent",
                    color: isToday ? "#fff" : inMonth ? "var(--bms-text)" : "#70757a",
                  }}>
                    {day.date()}
                  </span>
                </div>
                {visible.map((item) => (
                  <EventPill key={item.id} item={item} compact onClick={() => onSelect(item)} />
                ))}
                {more > 0 && (
                  <Text type="secondary" style={{ fontSize: 11, paddingLeft: 4 }}>+{more} more</Text>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DayView({
  cursor, items, onSelect,
}: { cursor: Dayjs; items: FollowUpItem[]; onSelect: (item: FollowUpItem) => void }) {
  const today = dayjs();
  const isToday = cursor.isSame(today, "day");
  const hours = useHourSlots();
  const allDay = allDayItems(items, cursor);
  const timed = timedItems(items, cursor);

  return (
    <div style={{ border: BORDER, borderRadius: 8, overflow: "hidden", background: "var(--bms-surface)" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "56px 1fr",
        borderBottom: BORDER, background: "var(--bms-surface-2)",
      }}>
        <div />
        <div style={{ padding: "12px 16px", borderLeft: BORDER }}>
          <div style={{ fontSize: 11, color: isToday ? "#1a73e8" : "#70757a", fontWeight: 600, letterSpacing: 0.5 }}>
            {WEEKDAYS[cursor.day()].toUpperCase()}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 48, height: 48, borderRadius: "50%", marginTop: 6,
            fontSize: 28, fontWeight: isToday ? 500 : 400, lineHeight: 1,
            background: isToday ? "#1a73e8" : "transparent",
            color: isToday ? "#fff" : "var(--bms-text)",
          }}>
            {cursor.date()}
          </div>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "56px 1fr",
        borderBottom: BORDER, minHeight: allDay.length ? 36 : 28,
      }}>
        <div style={{ fontSize: 10, color: "#70757a", padding: "8px 4px", textAlign: "right" }}>all-day</div>
        <div style={{ borderLeft: BORDER, padding: "4px 8px" }}>
          {allDay.map((item) => (
            <EventPill key={item.id} item={item} onClick={() => onSelect(item)} />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", maxHeight: 640, overflowY: "auto" }}>
        <HourLabels hours={hours} />
        <div style={{ position: "relative", borderLeft: BORDER }}>
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT, borderTop: h > HOUR_START ? BORDER : undefined }} />
          ))}
          {timed.map((item) => (
            <TimedEventBlock key={item.id} item={item} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  cursor, items, onSelect,
}: { cursor: Dayjs; items: FollowUpItem[]; onSelect: (item: FollowUpItem) => void }) {
  const weekStart = cursor.startOf("week");
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day")), [weekStart]);
  const today = dayjs();
  const hours = useHourSlots();

  return (
    <div style={{ border: BORDER, borderRadius: 8, overflow: "hidden", background: "var(--bms-surface)" }}>
      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: BORDER, background: "var(--bms-surface-2)" }}>
        <div />
        {days.map((day) => {
          const isToday = day.isSame(today, "day");
          return (
            <div key={day.format()} style={{ padding: "8px 4px", textAlign: "center", borderLeft: BORDER }}>
              <div style={{ fontSize: 11, color: "#70757a", fontWeight: 500 }}>{WEEKDAYS[day.day()].toUpperCase()}</div>
              <div style={{
                fontSize: 22, fontWeight: isToday ? 500 : 400, lineHeight: 1.2,
                color: isToday ? "#1a73e8" : "var(--bms-text)",
              }}>
                {day.date()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: BORDER, minHeight: 28 }}>
        <div style={{ fontSize: 10, color: "#70757a", padding: "6px 4px", textAlign: "right" }}>all-day</div>
        {days.map((day) => (
          <div key={`allday-${day.format()}`} style={{ borderLeft: BORDER, padding: "2px 4px" }}>
            {allDayItems(items, day).map((item) => (
              <EventPill key={item.id} item={item} compact onClick={() => onSelect(item)} />
            ))}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", maxHeight: 520, overflowY: "auto" }}>
        <HourLabels hours={hours} />
        {days.map((day) => (
          <div key={`grid-${day.format()}`} style={{ position: "relative", borderLeft: BORDER }}>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT, borderTop: h > HOUR_START ? BORDER : undefined }} />
            ))}
            {timedItems(items, day).map((item) => (
              <TimedEventBlock key={item.id} item={item} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FollowUpCalendarView({
  items, loading, onSelect,
}: {
  items: FollowUpItem[];
  loading?: boolean;
  onSelect: (item: FollowUpItem) => void;
}) {
  const [cursor, setCursor] = useState(() => dayjs());
  const [mode, setMode] = useState<CalendarMode>("month");

  const scheduled = useMemo(() => items.filter((i) => i.start_date), [items]);

  const title = mode === "month"
    ? cursor.format("MMMM YYYY")
    : mode === "week"
      ? `${cursor.startOf("week").format("MMM D")} – ${cursor.endOf("week").format("MMM D, YYYY")}`
      : cursor.format("dddd, MMMM D, YYYY");

  const goToday = () => setCursor(dayjs());
  const goPrev = () => setCursor((c) => {
    if (mode === "month") return c.subtract(1, "month");
    if (mode === "week") return c.subtract(1, "week");
    return c.subtract(1, "day");
  });
  const goNext = () => setCursor((c) => {
    if (mode === "month") return c.add(1, "month");
    if (mode === "week") return c.add(1, "week");
    return c.add(1, "day");
  });

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button onClick={goToday} style={{ borderRadius: 20, fontWeight: 500 }}>Today</Button>
          <Button type="text" icon={<LeftOutlined />} onClick={goPrev} />
          <Button type="text" icon={<RightOutlined />} onClick={goNext} />
          <span style={{ fontSize: 20, fontWeight: 400, color: "var(--bms-text)", marginLeft: 4 }}>{title}</span>
        </div>
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as CalendarMode)}
          options={[
            { label: "Day", value: "day" },
            { label: "Week", value: "week" },
            { label: "Month", value: "month" },
          ]}
        />
      </div>

      {scheduled.length === 0 ? (
        <Empty description="No scheduled follow-ups — add a due date to appear on the calendar" />
      ) : mode === "month" ? (
        <MonthView cursor={cursor} items={scheduled} onSelect={onSelect} />
      ) : mode === "week" ? (
        <WeekView cursor={cursor} items={scheduled} onSelect={onSelect} />
      ) : (
        <DayView cursor={cursor} items={scheduled} onSelect={onSelect} />
      )}

      <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
        Click an event to view full details. Colors reflect priority.
      </Text>
    </div>
  );
}
