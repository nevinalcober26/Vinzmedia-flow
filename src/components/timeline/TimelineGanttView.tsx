"use client";

import React, { useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import {
  format,
  addDays,
  differenceInDays,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { Task } from "@/types";
import {
  Calendar,
  Clock,
  Flag,
  ArrowRight,
  AlertTriangle,
  Layers,
  Milestone as MilestoneIcon,
} from "lucide-react";
import { getPriorityBadgeColor, isOverdue } from "@/lib/utils";

interface TimelineGanttViewProps {
  projectId?: string | null;
}

export function TimelineGanttView({ projectId }: TimelineGanttViewProps) {
  const { tasks, projects, setEditingTask } = useStore();

  const currentProject = projects.find((p) => p.id === projectId);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (projectId && t.project_id !== projectId) return false;
      return true;
    });
  }, [tasks, projectId]);

  // Timeline window: 21 days starting from 4 days ago
  const startDate = useMemo(() => addDays(new Date(), -4), []);
  const totalDays = 24;

  const timelineDays = useMemo(() => {
    return Array.from({ length: totalDays }).map((_, i) => addDays(startDate, i));
  }, [startDate]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {currentProject ? `${currentProject.name} — Schedule & Gantt` : "Workspace Gantt Timeline"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Task durations, milestones, and schedule dependencies
          </p>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="min-w-[960px]">
          {/* Timeline Header Days */}
          <div className="flex border-b border-border/80 bg-secondary/40 sticky top-0 z-10">
            <div className="w-64 p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/60 flex-shrink-0">
              Task Name
            </div>
            <div className="flex-1 grid grid-cols-24 divide-x divide-border/40 text-center">
              {timelineDays.map((day) => {
                const isCurrent =
                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                return (
                  <div
                    key={day.toISOString()}
                    className={`py-2 text-[10px] font-mono ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div>{format(day, "EEE")}</div>
                    <div className="font-semibold">{format(day, "d")}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestones row if current project has milestones */}
          {currentProject?.milestones && currentProject.milestones.length > 0 && (
            <div className="flex border-b border-border/40 bg-purple-500/5 items-center">
              <div className="w-64 p-2.5 text-xs font-semibold text-purple-600 dark:text-purple-400 border-r border-border/60 flex items-center space-x-2 flex-shrink-0">
                <Flag className="w-3.5 h-3.5" />
                <span>Project Milestones</span>
              </div>
              <div className="flex-1 relative h-9">
                {currentProject.milestones.map((m) => {
                  const mDate = parseISO(m.target_date);
                  const dayOffset = differenceInDays(mDate, startDate);
                  if (dayOffset < 0 || dayOffset >= totalDays) return null;
                  const leftPercent = (dayOffset / totalDays) * 100;
                  return (
                    <div
                      key={m.id}
                      style={{ left: `${leftPercent}%` }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-semibold shadow-xs z-10"
                    >
                      <span>◆</span>
                      <span className="truncate max-w-[120px]">{m.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Task Gantt Bars */}
          <div className="divide-y divide-border/30">
            {filteredTasks.map((task) => {
              const priorityStyle = getPriorityBadgeColor(task.priority);
              const overdue = isOverdue(task.due_date, task.status);

              // Calculate start and end offset in days
              const taskStart = task.start_date
                ? parseISO(task.start_date)
                : addDays(new Date(), -2);
              const taskDue = task.due_date
                ? parseISO(task.due_date)
                : addDays(taskStart, 3);

              let startDayOffset = differenceInDays(taskStart, startDate);
              let durationDays = Math.max(1, differenceInDays(taskDue, taskStart) + 1);

              if (startDayOffset < 0) {
                durationDays += startDayOffset;
                startDayOffset = 0;
              }

              const leftPercent = Math.max(
                0,
                Math.min(100, (startDayOffset / totalDays) * 100)
              );
              const widthPercent = Math.max(
                3,
                Math.min(100 - leftPercent, (durationDays / totalDays) * 100)
              );

              return (
                <div
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="flex items-center hover:bg-secondary/40 transition-colors cursor-pointer h-12"
                >
                  {/* Task Label on Left */}
                  <div className="w-64 px-3 flex items-center justify-between border-r border-border/60 flex-shrink-0">
                    <span className="text-xs font-semibold text-foreground truncate hover:text-primary">
                      {task.title}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} capitalize`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {/* Gantt Bar Area */}
                  <div className="flex-1 relative h-full">
                    {/* Background grid vertical lines */}
                    <div className="absolute inset-0 grid grid-cols-24 divide-x divide-border/20 pointer-events-none" />

                    {/* Task Bar */}
                    <div
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-lg px-2 flex items-center justify-between text-[11px] font-medium shadow-xs transition-all hover:scale-y-110 ${
                        task.status === "done"
                          ? "bg-emerald-500 text-white"
                          : overdue
                          ? "bg-red-500/80 text-white"
                          : "bg-indigo-600 text-white"
                      }`}
                    >
                      <span className="truncate">{task.title}</span>
                      {task.dependencies?.length > 0 && (
                        <ArrowRight className="w-3 h-3 flex-shrink-0 ml-1 opacity-70" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
