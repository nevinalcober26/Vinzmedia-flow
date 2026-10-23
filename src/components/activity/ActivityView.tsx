"use client";

import { EmptyState } from "@/components/common/EmptyState";
import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  Activity,
  Filter,
  CheckCircle2,
  MessageSquare,
  FolderKanban,
  Megaphone,
  UserCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";

export function ActivityView() {
  const { activityLogs, projects, setEditingTask, tasks, setSelectedProjectId } = useStore();
  const [filterProject, setFilterProject] = useState("all");

  const filteredLogs = activityLogs.filter((log) => {
    if (filterProject !== "all" && log.project_id !== filterProject) return false;
    return true;
  });

  const getActionIcon = (action: string) => {
    if (action.includes("task")) return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
    if (action.includes("comment")) return <MessageSquare className="w-4 h-4 text-blue-500" />;
    if (action.includes("project")) return <FolderKanban className="w-4 h-4 text-emerald-500" />;
    if (action.includes("announcement")) return <Megaphone className="w-4 h-4 text-purple-500" />;
    return <Activity className="w-4 h-4 text-amber-500" />;
  };

  const handleItemClick = (log: (typeof activityLogs)[0]) => {
    if (log.task_id) {
      const task = tasks.find((t) => t.id === log.task_id);
      if (task) setEditingTask(task);
    } else if (log.project_id) {
      setSelectedProjectId(log.project_id);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-foreground">Workspace Activity Stream</h2>
          <p className="text-xs text-muted-foreground">
            Complete audit trail of task status shifts, updates, and collaboration events
          </p>
        </div>

        {/* Project Filter */}
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Activity Timeline List */}
      <div className="flex-1 overflow-y-auto pb-8">
        {filteredLogs.length === 0 && <EmptyState icon={Activity} title={filterProject !== "all" ? "No activity for this project yet" : "Your workspace story starts here"} description="Project updates, task changes, and team activity will appear here as work moves forward." actionLabel={filterProject !== "all" ? "View all activity" : undefined} onAction={filterProject !== "all" ? () => setFilterProject("all") : undefined} />}
        {filteredLogs.map((log, index) => (
          <div key={log.id} className="relative flex gap-4 pl-1 pb-5 last:pb-0">
            {index < filteredLogs.length - 1 && <span aria-hidden="true" className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />}
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-xs">
              {getActionIcon(log.action)}
            </div>
            <button
            type="button"
            onClick={() => handleItemClick(log)}
            className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-xs transition-colors hover:border-primary/30 hover:bg-secondary/30"
          >
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
                  <UserAvatar name={log.user?.full_name || "Teammate"} avatarUrl={log.user?.avatar_url} size="sm" />
                  <span className="truncate">{log.user?.full_name || "Teammate"}</span>
                </span>
                <time dateTime={log.created_at} className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeTime(log.created_at)}
                </time>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/90">{log.details}</p>
              {log.project_id && (
                <div className="mt-1 flex items-center space-x-1 text-[11px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{projects.find((p) => p.id === log.project_id)?.name}</span>
                </div>
              )}
            </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
