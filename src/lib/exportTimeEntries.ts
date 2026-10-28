import { format } from "date-fns";
import { formatDuration } from "@/lib/utils";
import { Project, Task, TimeEntry } from "@/types";

export function exportTimeEntriesCsv(
  entries: TimeEntry[],
  projects: Project[],
  tasks: Task[],
  filenamePrefix = "vinzmedia-time-logs"
): number {
  const escapeCell = (value: string | number | undefined) => {
    const safe = String(value ?? "").replace(/^[\s]*[=+\-@]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = [
    "Date",
    "Project",
    "Task",
    "Work summary",
    "Time spent",
    "Duration (seconds)",
    "Started at",
    "Ended at",
    "Billable"
  ];
  const rows = [...entries]
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map((entry) => {
      const project = projects.find((item) => item.id === entry.project_id);
      const task = tasks.find((item) => item.id === entry.task_id);
      return [
        format(new Date(entry.started_at), "yyyy-MM-dd"),
        project?.name || entry.project_name || "",
        task?.title || entry.task_title || "",
        entry.work_summary || entry.description || "",
        formatDuration(entry.duration_seconds),
        entry.duration_seconds,
        entry.started_at,
        entry.ended_at || "",
        entry.is_billable ? "Yes" : "No",
      ];
    });
  const csv = [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return rows.length;
}
