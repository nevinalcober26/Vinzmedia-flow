"use client";

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
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            onClick={() => handleItemClick(log)}
            className="flex items-start space-x-3.5 p-3.5 rounded-xl border border-border/70 bg-card hover:bg-secondary/40 transition-colors cursor-pointer"
          >
            <UserAvatar
              name={log.user?.full_name || "Teammate"}
              avatarUrl={log.user?.avatar_url}
              size="sm"
              className="mt-0.5 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {log.user?.full_name || "Teammate"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatRelativeTime(log.created_at)}
                </span>
              </div>
              <p className="text-xs text-foreground/90 mt-0.5">{log.details}</p>
              {log.project_id && (
                <div className="mt-1 flex items-center space-x-1 text-[11px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{projects.find((p) => p.id === log.project_id)?.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
