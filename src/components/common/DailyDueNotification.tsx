import { useEffect } from "react";
import { notification } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { workspaceApi } from "@/services/workspace";
import { projectsApi } from "@/services/projects";
import { PERMS } from "@/constants/permissions";
import { useAuthStore } from "@/store/auth";

export default function DailyDueNotification() {
  const todayStr = dayjs().format("YYYY-MM-DD");
  const permissions = useAuthStore((s) => s.permissions);

  const canViewCalendar =
    permissions.includes(PERMS.WORKSPACE_CALENDAR_VIEW as never) ||
    permissions.includes(PERMS.CRM_FOLLOWUP_VIEW as never);
  const canViewProjects = permissions.includes(PERMS.PROJECT_VIEW as never);

  const { data: calData } = useQuery({
    queryKey: ["workspace_calendar", todayStr, todayStr],
    queryFn: () => workspaceApi.calendar(todayStr, todayStr),
    enabled: canViewCalendar,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["due_projects"],
    queryFn: () => projectsApi.list({ limit: 100 }), // Fetch active projects
    enabled: canViewProjects,
  });

  useEffect(() => {
    if (!calData?.events && !projectsData?.results) return;

    const lastNotified = localStorage.getItem("last_daily_notification_date");
    if (lastNotified === todayStr) return;

    const dueToday = (calData?.events ?? []).filter(
      (ev) =>
        ev.due_date === todayStr ||
        ev.start_date === todayStr ||
        ev.end_date === todayStr
    );

    const dueProjects = (projectsData?.results ?? []).filter(
      (proj) => proj.end_date === todayStr && proj.is_active
    );

    if (dueToday.length > 0 || dueProjects.length > 0) {
      const todoCount = dueToday.filter((e) => e.source === "todo").length;
      const followUpCount = dueToday.filter((e) => e.source === "followup").length;
      const projectCount = dueProjects.length;

      let msg = [];
      if (todoCount > 0) msg.push(`${todoCount} To-Do(s)`);
      if (followUpCount > 0) msg.push(`${followUpCount} Follow-Up(s)/Meeting(s)`);
      if (projectCount > 0) msg.push(`${projectCount} Project(s)`);

      notification.info({
        message: "Due Today",
        description: `You have ${msg.join(", ")} scheduled or due today.`,
        placement: "topRight",
        duration: 10,
      });

      localStorage.setItem("last_daily_notification_date", todayStr);
    } else {
      localStorage.setItem("last_daily_notification_date", todayStr);
    }
  }, [calData, projectsData, todayStr]);

  return null;
}