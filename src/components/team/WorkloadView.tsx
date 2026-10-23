"use client";

import React from "react";
import { useStore } from "@/context/StoreContext";
import { BarChart2, CheckCircle2, Clock, AlertTriangle, Users } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export function WorkloadView() {
  const { users, tasks, setEditingTask } = useStore();

  return (
    <div className="flex flex-col h-full space-y-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-foreground">Team Workload & Capacity</h2>
          <p className="text-xs text-muted-foreground">
            Balance task allocation, track weekly hours, and prevent burnout
          </p>
        </div>
      </div>

      {/* Workload Cards List */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-8">
        {users.map((member) => {
          const assignedTasks = tasks.filter((t) =>
            (t.assignee_ids || []).includes(member.id)
          );
          const activeTasks = assignedTasks.filter((t) => t.status !== "done");
          const totalEstimatedHours = activeTasks.reduce(
            (sum, t) => sum + (t.estimated_hours || 4),
            0
          );
          const totalTrackedSeconds = assignedTasks.reduce(
            (sum, t) => sum + (t.tracked_seconds || 0),
            0
          );

          // Standard capacity is 40 hours/week
          const capacityPercent = Math.min(
            150,
            Math.round((totalEstimatedHours / 40) * 100)
          );
          const isOverloaded = totalEstimatedHours > 40;

          return (
            <div
              key={member.id}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4"
            >
              {/* Member Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={member.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{member.full_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {member.title} • {member.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Active Tasks</span>
                    <span className="font-bold text-foreground font-mono">{activeTasks.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Est. Workload</span>
                    <span className="font-bold text-foreground font-mono">
                      {totalEstimatedHours}h / 40h
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Logged Time</span>
                    <span className="font-bold text-emerald-500 font-mono">
                      {formatDuration(totalTrackedSeconds)}
                    </span>
                  </div>
                  {isOverloaded && (
                    <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/30 font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Over Capacity</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Capacity Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Weekly Capacity Allocation</span>
                  <span className="font-mono font-semibold text-foreground">
                    {capacityPercent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      capacityPercent > 100
                        ? "bg-red-500"
                        : capacityPercent > 75
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, capacityPercent)}%` }}
                  />
                </div>
              </div>

              {/* Active Tasks mini-chips */}
              {activeTasks.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Current Active Tasks
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setEditingTask(t)}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/50 text-xs text-foreground transition-colors"
                      >
                        <span className="font-medium truncate max-w-xs">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {t.estimated_hours || 4}h
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
