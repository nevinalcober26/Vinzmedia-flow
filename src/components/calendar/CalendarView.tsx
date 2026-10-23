"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
} from "lucide-react";
import { getPriorityBadgeColor } from "@/lib/utils";

interface CalendarViewProps {
  projectId?: string | null;
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const { tasks, projects, setEditingTask, setIsCreateTaskModalOpen } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (projectId && t.project_id !== projectId) return false;
      return Boolean(t.due_date);
    });
  }, [tasks, projectId]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof filteredTasks> = {};
    filteredTasks.forEach((t) => {
      if (!t.due_date) return;
      const key = t.due_date;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTasks]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-3">
          <h2 className="text-base font-bold text-foreground">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-border/80 hover:bg-secondary text-foreground transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsCreateTaskModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-border/80 bg-secondary/40 text-center py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/40 overflow-y-auto">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate[dateStr] || [];
            const isCurMonth = isSameMonth(day, monthStart);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setIsCreateTaskModalOpen(true, "todo", dateStr)}
                title={`Click anywhere in this square to add a task for ${format(day, "MMMM d, yyyy")}`}
                className={`group/day min-h-[105px] p-2 flex flex-col transition-all overflow-hidden cursor-pointer select-none relative ${
                  !isCurMonth
                    ? "bg-secondary/15 opacity-50 hover:opacity-80 hover:bg-secondary/25"
                    : "bg-card hover:bg-primary/5 hover:ring-1 hover:ring-primary/30"
                } ${isCurrentDay ? "ring-1 ring-inset ring-primary/40 bg-primary/5" : ""}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1.5 px-0.5 pointer-events-none">
                  <span
                    className={`text-xs font-mono font-semibold rounded-full w-6 h-6 flex items-center justify-center transition-all ${
                      isCurrentDay
                        ? "bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary/20 scale-105"
                        : "text-foreground group-hover/day:text-primary group-hover/day:font-bold"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="flex items-center space-x-1">
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono font-medium">
                        {dayTasks.length}
                      </span>
                    )}
                    <div
                      className="opacity-0 group-hover/day:opacity-100 p-0.5 rounded-md text-primary bg-primary/10 transition-all"
                      title={`Add task for ${format(day, "MMM d")}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Day Task Pills */}
                <div className="flex-1 overflow-y-auto space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const project = projects.find((p) => p.id === task.project_id);
                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                        }}
                        title={`Task: ${task.title}`}
                        className="px-1.5 py-0.5 rounded-lg text-[10px] font-medium bg-secondary/80 hover:bg-secondary text-foreground truncate cursor-pointer border border-border/40 hover:border-primary/50 flex items-center space-x-1.5 transition-all shadow-2xs"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project?.color || "#6366f1" }}
                        />
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCreateTaskModalOpen(true, "todo", dateStr);
                      }}
                      className="text-[10px] text-primary hover:underline px-1 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>+{dayTasks.length - 3} more</span>
                      <span className="text-[9px] opacity-75">+ Add</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
