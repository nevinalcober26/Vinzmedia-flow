import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { PriorityLevel, ProjectStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "No date";
  try {
    const d = new Date(dateString);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString?: string | null): string {
  if (!dateString) return "--";
  try {
    const d = new Date(dateString);
    return format(d, "MMM d");
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

export function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? `${h.toString().padStart(2, "0")}:` : ""}${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function isOverdue(dateString?: string | null, statusKey?: string): boolean {
  if (!dateString) return false;
  if (statusKey === "done" || statusKey === "completed") return false;
  try {
    const d = new Date(dateString);
    return isPast(d) && !isToday(d);
  } catch {
    return false;
  }
}

export function getPriorityBadgeColor(priority: PriorityLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (priority) {
    case "urgent":
      return {
        bg: "bg-red-500/10 dark:bg-red-500/20",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-500/30",
        dot: "bg-red-500",
      };
    case "high":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/30",
        dot: "bg-amber-500",
      };
    case "medium":
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/30",
        dot: "bg-blue-500",
      };
    case "low":
    default:
      return {
        bg: "bg-slate-500/10 dark:bg-slate-500/20",
        text: "text-slate-600 dark:text-slate-400",
        border: "border-slate-500/30",
        dot: "bg-slate-400",
      };
  }
}

export function getProjectStatusBadge(status: ProjectStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      };
    case "planning":
      return {
        label: "Planning",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      };
    case "on_hold":
      return {
        label: "On Hold",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      };
    case "archived":
      return {
        label: "Archived",
        className: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/30",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground border-border",
      };
  }
}

export function generateId(_prefix?: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
