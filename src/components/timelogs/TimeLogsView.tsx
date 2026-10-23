"use client";

import { EmptyState } from "@/components/common/EmptyState";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  Square,
  Plus,
  Search,
  Filter,
  FolderKanban,
  User as UserIcon,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  Sparkles,
  Timer,
  Building2,
  Trash2,
  History,
  FileSpreadsheet,
  Target,
  Edit2,
  X,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
  subDays,
  parseISO,
  isValid,
} from "date-fns";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { Task, Project, TimeEntry, User } from "@/types";
import { formatDuration, formatTimerDisplay, formatDate } from "@/lib/utils";
import { formatCurrencyAmount } from "@/lib/currencyRates";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ClientAvatar } from "@/components/common/ClientAvatar";
import { getDepartmentBadge, getTaskTypeBadge } from "@/lib/taskTypes";

export function TimeLogsView() {
  const {
    projects,
    tasks,
    users,
    clients,
    timeEntries,
    activeTimer,
    startTimer,
    stopTimer,
    addManualTimeEntry,
    updateTask,
    currentUser,
    setSelectedProjectId,
    setActiveView,
    setIsCreateTaskModalOpen,
  } = useStore();
  const toast = useToast();

  // View & Filter states: Default to weekly table timesheet view
  const [viewMode, setViewMode] = useState<"timesheet" | "project_columns" | "detailed_logs">("timesheet");
  const [search, setSearch] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>("all");
  const [hideZeroHours, setHideZeroHours] = useState(false);

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Weekly Capacity Target Hours (Default 40h/week, customizable per user request)
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vinzflow_weekly_target_hours");
      if (saved) return Number(saved) || 40;
    }
    return 40;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState<string>(String(weeklyTargetHours));

  const handleSaveTargetHours = () => {
    const val = Number(targetInput);
    if (val && val > 0 && val <= 168) {
      setWeeklyTargetHours(val);
      if (typeof window !== "undefined") {
        localStorage.setItem("vinzflow_weekly_target_hours", String(val));
      }
      toast.success("Target Updated", `Weekly hours capacity set to ${val} hrs/week`);
    }
    setIsEditingTarget(false);
  };

  // Manual Log Time Modal state
  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false);
  const [modalTaskId, setModalTaskId] = useState<string>("");
  const [modalHours, setModalHours] = useState<string>("1");
  const [modalMinutes, setModalMinutes] = useState<string>("30");
  const [modalNote, setModalNote] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Date Calculations
  const today = useMemo(() => new Date(), []);
  const yesterdayDate = useMemo(() => subDays(new Date(), 1), []);
  const todayStr = useMemo(() => format(today, "yyyy-MM-dd"), [today]);
  const yesterdayStr = useMemo(() => format(yesterdayDate, "yyyy-MM-dd"), [yesterdayDate]);

  // Week Interval: Monday to Sunday
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);
  const isCurrentWeek = useMemo(() => isSameDay(startOfWeek(today, { weekStartsOn: 1 }), weekStart), [today, weekStart]);

  // Navigation functions
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const goToYesterday = () => {
    setSelectedDate(subDays(new Date(), 1));
  };

  const goToPrevWeek = () => {
    setSelectedDate((prev) => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setSelectedDate((prev) => addWeeks(prev, 1));
  };

  const handleDateSelect = (dateStr: string) => {
    if (!dateStr) return;
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  };

  // Quick Open Modal for specific task and optional day
  const openLogTimeForTask = (taskId: string, targetDateStr?: string) => {
    setModalTaskId(taskId);
    setModalHours("1");
    setModalMinutes("0");
    setModalNote("");
    setModalDate(targetDateStr || format(selectedDate, "yyyy-MM-dd"));
    setIsLogTimeModalOpen(true);
  };

  const handleSaveManualTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTaskId) {
      toast.error("Please select a task", "A task must be selected to log time.");
      return;
    }
    const totalMinutes = (Number(modalHours) || 0) * 60 + (Number(modalMinutes) || 0);
    if (totalMinutes <= 0) {
      toast.error("Invalid duration", "Please enter at least 1 minute.");
      return;
    }

    addManualTimeEntry(modalTaskId, totalMinutes, modalNote.trim() || undefined, modalDate);
    toast.success("Time Logged!", `Added ${totalMinutes}m to task on ${modalDate}.`);
    setIsLogTimeModalOpen(false);
  };

  // Grouped tasks by Project map
  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const list = map.get(t.project_id) || [];
      list.push(t);
      map.set(t.project_id, list);
    });
    return map;
  }, [tasks]);

  // Clients map helper
  const clientMap = useMemo(() => {
    const map = new Map<string, any>();
    clients.forEach((c) => map.set(c.id, c));
    return map;
  }, [clients]);

  // Overall KPI statistics
  const kpis = useMemo(() => {
    let totalSeconds = 0;
    let totalBillableValue = 0;
    let tasksWithTime = 0;

    tasks.forEach((t) => {
      const sec = t.tracked_seconds || 0;
      totalSeconds += sec;
      if (sec > 0) tasksWithTime++;

      const proj = projects.find((p) => p.id === t.project_id);
      const rate = proj?.hourly_rate || 0;
      totalBillableValue += (sec / 3600) * rate;
    });

    return {
      totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      totalSeconds,
      totalBillableValue,
      tasksWithTime,
      totalTasks: tasks.length,
    };
  }, [tasks, projects]);

  // Filtered Tasks for Timesheet Table
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedProjectFilter !== "all" && task.project_id !== selectedProjectFilter) return false;
      if (selectedDepartmentFilter !== "all" && task.department !== selectedDepartmentFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchAssignees = (task.assignee_ids || []).some((uid) => {
          const u = users.find((user) => user.id === uid);
          return u?.full_name.toLowerCase().includes(q);
        });
        if (!matchTitle && !matchAssignees) return false;
      }
      return true;
    });
  }, [tasks, selectedProjectFilter, selectedDepartmentFilter, search, users]);

  // Helper to get seconds logged for a task on a specific day
  const getTaskSecondsForDay = (task: Task, dayDateStr: string, dayDate: Date): number => {
    const isTodayCell = isToday(dayDate);
    const isYesterdayCell = isSameDay(dayDate, yesterdayDate);

    // Filter timeEntries matching this task and date
    const matching = timeEntries.filter((e) => {
      if (e.task_id !== task.id) return false;
      try {
        const eDate = format(parseISO(e.started_at), "yyyy-MM-dd");
        return eDate === dayDateStr;
      } catch {
        return false;
      }
    });

    let seconds = matching.reduce((acc, e) => acc + (e.duration_seconds || 0), 0);

    // Include real-time active stopwatch if running on this task on today
    if (activeTimer?.taskId === task.id && isTodayCell) {
      seconds += activeTimer.seconds;
    }

    // Fallback for tasks with tracked_seconds but no granular time_entries (sample/demo data)
    if (seconds === 0 && (task.tracked_seconds || 0) > 0) {
      const hasAnyEntriesForTask = timeEntries.some((e) => e.task_id === task.id);
      if (!hasAnyEntriesForTask && isCurrentWeek) {
        if (isTodayCell) {
          seconds = Math.round((task.tracked_seconds || 0) * 0.6);
        } else if (isYesterdayCell) {
          seconds = Math.round((task.tracked_seconds || 0) * 0.4);
        }
      }
    }

    return seconds;
  };

  // Computations for Weekly Timesheet Table
  const { taskRowsData, projectRowsData, dayTotals, weeklyTotalHours } = useMemo(() => {
    const dayTotalsMap: Record<string, number> = {};
    weekDays.forEach((d) => {
      dayTotalsMap[format(d, "yyyy-MM-dd")] = 0;
    });

    let totalWeekSec = 0;

    const rows = filteredTasks.map((task) => {
      const daySecondsList: number[] = [];
      let taskWeekSec = 0;

      weekDays.forEach((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const sec = getTaskSecondsForDay(task, dateStr, d);
        daySecondsList.push(sec);
        taskWeekSec += sec;
        dayTotalsMap[dateStr] = (dayTotalsMap[dateStr] || 0) + sec;
      });

      totalWeekSec += taskWeekSec;

      return {
        task,
        daySecondsList,
        taskWeekSec,
        taskWeekHours: Math.round((taskWeekSec / 3600) * 10) / 10,
      };
    });

    const projectSecondsByDay = new Map<string, number>();
    const projectsWithSessions = new Set<string>();
    timeEntries.forEach((entry) => {
      if (entry.task_id || !entry.project_id) return;
      projectsWithSessions.add(entry.project_id);
      const startedAt = parseISO(entry.started_at);
      if (!isValid(startedAt)) return;
      const day = format(startedAt, "yyyy-MM-dd");
      const key = `${entry.project_id}:${day}`;
      projectSecondsByDay.set(key, (projectSecondsByDay.get(key) || 0) + entry.duration_seconds);
    });

    const projectRows = projects.filter((project) => {
      if (selectedProjectFilter !== "all" && project.id !== selectedProjectFilter) return false;
      if (selectedDepartmentFilter !== "all") return false;
      if (search.trim() && !project.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return projectsWithSessions.has(project.id) ||
        (activeTimer?.projectId === project.id && !activeTimer.taskId);
    }).map((project) => {
      const daySecondsList = weekDays.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const savedSeconds = projectSecondsByDay.get(`${project.id}:${dateStr}`) || 0;
        const runningSeconds = activeTimer?.projectId === project.id && !activeTimer.taskId && isToday(day) ? activeTimer.seconds : 0;
        const seconds = savedSeconds + runningSeconds;
        dayTotalsMap[dateStr] = (dayTotalsMap[dateStr] || 0) + seconds;
        return seconds;
      });
      const projectWeekSec = daySecondsList.reduce((sum, seconds) => sum + seconds, 0);
      totalWeekSec += projectWeekSec;
      return { project, daySecondsList, projectWeekSec };
    });

    // Optional filter: hide zero hours
    const visibleRows = hideZeroHours ? rows.filter((r) => r.taskWeekSec > 0) : rows;

    const dayTotalsHours: Record<string, number> = {};
    Object.keys(dayTotalsMap).forEach((k) => {
      dayTotalsHours[k] = Math.round((dayTotalsMap[k] / 3600) * 10) / 10;
    });

    return {
      taskRowsData: visibleRows,
      projectRowsData: hideZeroHours ? projectRows.filter((row) => row.projectWeekSec > 0) : projectRows,
      dayTotals: dayTotalsHours,
      weeklyTotalHours: Math.round((totalWeekSec / 3600) * 10) / 10,
    };
  }, [filteredTasks, projects, selectedProjectFilter, selectedDepartmentFilter, search, weekDays, timeEntries, activeTimer, hideZeroHours, isCurrentWeek, yesterdayDate]);

  // Weekly progress percentage & status
  const weeklyProgressPercent = Math.min(100, (weeklyTotalHours / weeklyTargetHours) * 100);
  const remainingHours = Math.max(0, weeklyTargetHours - weeklyTotalHours);

  // Filtered Projects for Column Board
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedProjectFilter !== "all" && p.id !== selectedProjectFilter) return false;
      return true;
    });
  }, [projects, selectedProjectFilter]);

  return (
    <div className="flex h-full flex-col space-y-4 overflow-y-auto pr-1">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-xs">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Time Logs & Labor Tracking
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {weeklyTotalHours.toFixed(1)} hrs This Week
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Monitor daily table columns, weekly capacity hours, and active task stopwatches
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-secondary/50 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setViewMode("timesheet")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "timesheet"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly Timesheet Table
            </button>
            <button
              onClick={() => setViewMode("project_columns")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "project_columns"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Project Columns
            </button>
            <button
              onClick={() => setViewMode("detailed_logs")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "detailed_logs"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Session Logs
            </button>
          </div>

          {/* Quick Manual Log Button */}
          <button
            onClick={() => {
              setModalTaskId(tasks[0]?.id || "");
              setModalDate(format(selectedDate, "yyyy-MM-dd"));
              setIsLogTimeModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Time</span>
          </button>
        </div>
      </div>

      {/* Live Active Stopwatch Bar if timer is running */}
      <AnimatePresence>
        {activeTimer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 p-3.5 flex items-center justify-between shadow-sm animate-pulse"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Active Timer Running
                </span>
                <h4 className="text-xs font-bold text-foreground truncate max-w-md">
                  {activeTimer.taskTitle}
                </h4>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 rounded-xl bg-background/80 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm tracking-wider shadow-xs">
                {formatTimerDisplay(activeTimer.seconds)}
              </div>
              <button
                onClick={() => stopTimer()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop & Save Session</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WEEKLY CAPACITY / HOURS SET PER WEEK BANNER (User Request: "will show number hours set per week!") */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-primary/5 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Capacity Metrics */}
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Weekly Hours Capacity Target
              </span>
              {isEditingTarget ? (
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-16 px-1.5 py-0.5 text-xs bg-background border border-primary rounded font-bold font-mono"
                  />
                  <button
                    onClick={handleSaveTargetHours}
                    className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="px-1.5 py-0.5 text-muted-foreground text-[10px] hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTargetInput(String(weeklyTargetHours));
                    setIsEditingTarget(true);
                  }}
                  title="Click to change weekly capacity"
                  className="flex items-center space-x-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer transition-colors"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>Edit Target</span>
                </button>
              )}
            </div>

            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-2xl font-black tracking-tight text-foreground font-mono">
                {weeklyTotalHours.toFixed(1)} <span className="text-sm font-semibold text-muted-foreground">/ {weeklyTargetHours}.0 hrs</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  weeklyTotalHours >= weeklyTargetHours
                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    : "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                }`}
              >
                {Math.round(weeklyProgressPercent)}% of target set
              </span>
            </div>
          </div>
        </div>

        {/* Right: Progress Track & Remaining Hours */}
        <div className="w-full md:w-72 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground text-[11px]">
              {remainingHours > 0 ? `${remainingHours.toFixed(1)} hrs left to goal` : "Goal Achieved! 🎉"}
            </span>
            <span className="font-bold text-foreground text-[11px]">
              {weeklyTotalHours.toFixed(1)}h logged
            </span>
          </div>
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                weeklyTotalHours >= weeklyTargetHours ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${weeklyProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* DATE NAVIGATION TOOLBAR (User Request: "there should be a calendar picker, the today, yesterday please!") */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 p-3 rounded-2xl shadow-xs">
        {/* Left: Quick Date Presets & Calendar Picker */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* "Today" Preset Button */}
          <button
            onClick={goToToday}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
              isCurrentWeek && isToday(selectedDate)
                ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>

          {/* "Yesterday" Preset Button */}
          <button
            onClick={goToYesterday}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
              isSameDay(selectedDate, yesterdayDate)
                ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Yesterday</span>
          </button>

          {/* Week Stepper (< and >) */}
          <div className="flex items-center space-x-1 pl-1">
            <button
              onClick={goToPrevWeek}
              title="Previous Week"
              className="p-1.5 rounded-lg border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextWeek}
              title="Next Week"
              className="p-1.5 rounded-lg border border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Calendar Date Picker */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-background border border-border rounded-xl text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">Jump to date:</span>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-foreground focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Formatted Date Range Label */}
          <span className="text-xs font-bold font-mono text-muted-foreground pl-1">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
        </div>

        {/* Right: Search & Filters */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* Search Box */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search task or assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Toggle hide zero hours tasks */}
          <label className="flex items-center space-x-1.5 text-xs font-medium text-muted-foreground cursor-pointer select-none pl-1">
            <input
              type="checkbox"
              checked={hideZeroHours}
              onChange={(e) => setHideZeroHours(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
            />
            <span className="hidden sm:inline">Active Only</span>
          </label>
        </div>
      </div>

      {/* VIEW 1: WEEKLY TIMESHEET TABLE (User Request: "The timelogs should be table columns show the total of hours per day, and total of hours per week!") */}
      {viewMode === "timesheet" && (
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-secondary/40 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[240px]">Task & Project Details</th>

                  {/* 7 Daily Table Columns with Daily Totals in the Header */}
                  {weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const isTodayHeader = isToday(day);
                    const isYesterdayHeader = isSameDay(day, yesterdayDate);
                    const isSelectedDay = isSameDay(day, selectedDate);
                    const dayTotal = dayTotals[dayStr] || 0;

                    return (
                      <th
                        key={dayStr}
                        onClick={() => setSelectedDate(day)}
                        className={`py-3 px-3 text-center min-w-[90px] transition-colors cursor-pointer ${
                          isSelectedDay
                            ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                            : isTodayHeader
                            ? "bg-emerald-500/10"
                            : "hover:bg-secondary/60"
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>{format(day, "EEE")}</span>
                          {isTodayHeader && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-500 text-white">
                              TODAY
                            </span>
                          )}
                          {isYesterdayHeader && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-muted-foreground/30 text-foreground">
                              YEST
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {format(day, "MMM d")}
                        </div>

                        {/* Total of hours per day in header */}
                        <div
                          className={`mt-1 font-mono font-bold text-xs ${
                            dayTotal > 0 ? "text-primary" : "text-muted-foreground/60"
                          }`}
                        >
                          {dayTotal.toFixed(1)}h
                        </div>
                      </th>
                    );
                  })}

                  {/* Total Hours Per Week Column Header */}
                  <th className="py-3 px-4 text-center min-w-[110px] bg-secondary/60 text-foreground">
                    <div>Total Week</div>
                    <div className="text-[10px] font-mono font-bold text-primary">
                      {weeklyTotalHours.toFixed(1)} / {weeklyTargetHours}h
                    </div>
                  </th>

                  <th className="py-3 px-4 text-center min-w-[90px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {taskRowsData.length === 0 && projectRowsData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-0">
                      <EmptyState className="border-0 rounded-none shadow-none" icon={Clock} title="Nothing on this timesheet yet" description="Start the project timeclock or track time on a task to see work here." actionLabel="Reset filters" onAction={() => { setSearch(""); setSelectedProjectFilter("all"); setSelectedDepartmentFilter("all"); setHideZeroHours(false); }} />
                    </td>
                  </tr>
                ) : (<>
                  {taskRowsData.map(({ task, daySecondsList, taskWeekHours }) => {
                    const project = projects.find((p) => p.id === task.project_id);
                    const isTimerRunningOnThisTask = activeTimer?.taskId === task.id;
                    const deptBadge = getDepartmentBadge(task.department || "Engineering");

                    return (
                      <tr
                        key={task.id}
                        className={`hover:bg-secondary/20 transition-colors ${
                          isTimerRunningOnThisTask ? "bg-emerald-500/5" : ""
                        }`}
                      >
                        {/* Task & Project Meta */}
                        <td className="py-3 px-4">
                          <div className="flex items-start space-x-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                              style={{ backgroundColor: project?.color || "#6366f1" }}
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-foreground text-xs leading-snug line-clamp-1 hover:text-primary transition-colors">
                                {task.title}
                              </h4>
                              <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap gap-y-0.5">
                                <span className="font-medium text-foreground/80">{project?.name || "General"}</span>
                                <span>•</span>
                                <span className={`px-1.5 py-0.2 rounded font-medium border ${deptBadge.bg} ${deptBadge.text} ${deptBadge.border}`}>
                                  {task.department || "Engineering"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 7 Daily Table Columns showing hours per day */}
                        {weekDays.map((day, dIdx) => {
                          const dayStr = format(day, "yyyy-MM-dd");
                          const daySec = daySecondsList[dIdx] || 0;
                          const dayHours = Math.round((daySec / 3600) * 10) / 10;
                          const isTodayCol = isToday(day);

                          return (
                            <td
                              key={dayStr}
                              className={`py-3 px-2 text-center font-mono text-xs group/cell relative ${
                                isTodayCol ? "bg-emerald-500/5" : ""
                              }`}
                            >
                              {dayHours > 0 ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold ${
                                    isTimerRunningOnThisTask && isTodayCol
                                      ? "bg-emerald-500 text-white animate-pulse"
                                      : "bg-primary/10 text-primary border border-primary/20"
                                  }`}
                                >
                                  {dayHours.toFixed(1)}h
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40 group-hover/cell:opacity-0 transition-opacity">
                                  —
                                </span>
                              )}

                              {/* Hover Quick Log Button for this specific day */}
                              <button
                                onClick={() => openLogTimeForTask(task.id, dayStr)}
                                title={`Log time on ${format(day, "MMM d")}`}
                                className="absolute inset-0 m-auto w-5 h-5 opacity-0 group-hover/cell:opacity-100 flex items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-bold shadow-xs transition-opacity cursor-pointer"
                              >
                                +
                              </button>
                            </td>
                          );
                        })}

                        {/* Task Total Week Hours */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-xs bg-secondary/30 text-foreground">
                          <span
                            className={`px-2.5 py-1 rounded-lg ${
                              taskWeekHours > 0 ? "bg-primary/15 text-primary font-bold" : "text-muted-foreground"
                            }`}
                          >
                            {taskWeekHours.toFixed(1)}h
                          </span>
                        </td>

                        {/* Row Actions: Stopwatch & + Log */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {/* Play / Stop Timer */}
                            {isTimerRunningOnThisTask ? (
                              <button
                                onClick={() => stopTimer()}
                                title="Stop active stopwatch"
                                className="p-1 rounded-md bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-xs animate-pulse cursor-pointer"
                              >
                                <Square className="w-3 h-3 fill-white" />
                              </button>
                            ) : (
                              <button
                                onClick={() => startTimer(task.id)}
                                title="Start Stopwatch"
                                className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                            )}

                            {/* Quick Add Log */}
                            <button
                              onClick={() => openLogTimeForTask(task.id)}
                              title="Add manual time entry"
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {projectRowsData.map(({ project, daySecondsList, projectWeekSec }) => (
                    <tr key={`project-time-${project.id}`} className="bg-primary/5 hover:bg-primary/10">
                      <td className="px-4 py-3"><p className="text-xs font-bold text-foreground">{project.name}</p><p className="text-[10px] text-muted-foreground">Project time · no task</p></td>
                      {daySecondsList.map((seconds, index) => <td key={index} className="px-2 py-3 text-center font-mono text-xs">{seconds > 0 ? `${(seconds / 3600).toFixed(1)}h` : "—"}</td>)}
                      <td className="bg-secondary/30 px-4 py-3 text-center font-mono text-xs font-bold">{(projectWeekSec / 3600).toFixed(1)}h</td>
                      <td className="px-4 py-3 text-center"><button type="button" onClick={() => setViewMode("detailed_logs")} className="text-[10px] font-semibold text-primary hover:underline">View log</button></td>
                    </tr>
                  ))}
                </>)}
              </tbody>

              {/* TABLE FOOTER: Daily Totals & Total of Hours Per Week */}
              <tfoot>
                <tr className="bg-secondary/60 border-t-2 border-border font-bold text-xs text-foreground">
                  <td className="py-3.5 px-4 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Daily Total Hours:</span>
                  </td>

                  {/* Daily Total Hours Column Sums */}
                  {weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const dayTotal = dayTotals[dayStr] || 0;
                    return (
                      <td key={dayStr} className="py-3.5 px-3 text-center font-mono font-bold text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            dayTotal > 0
                              ? "bg-primary/20 text-primary font-black"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {dayTotal.toFixed(1)}h
                        </span>
                      </td>
                    );
                  })}

                  {/* Grand Weekly Total Hours Column Sum */}
                  <td className="py-3.5 px-4 text-center font-mono font-black text-sm bg-primary/20 text-primary">
                    {weeklyTotalHours.toFixed(1)}h
                  </td>

                  <td className="py-3.5 px-4 text-center text-[10px] text-muted-foreground font-mono">
                    {Math.round(weeklyProgressPercent)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Project Columns Board */}
      {viewMode === "project_columns" && (
        <div className="flex-1 overflow-x-auto pb-4">
          {filteredProjects.length === 0 && <EmptyState icon={Clock} title="No projects to show" description="Clear your project filter or add a project to organize its tasks and tracked time." actionLabel="View projects" onAction={() => setActiveView("projects")} />}
          <div className="flex items-start space-x-4 min-w-max">
            {filteredProjects.map((project) => {
              const projTasks = (tasksByProject.get(project.id) || []).filter((task) => {
                if (hideZeroHours && (task.tracked_seconds || 0) === 0) return false;
                if (selectedDepartmentFilter !== "all" && task.department !== selectedDepartmentFilter) return false;
                if (search.trim()) {
                  const q = search.toLowerCase();
                  const matchTitle = task.title.toLowerCase().includes(q);
                  const matchAssignees = (task.assignee_ids || []).some((uid) => {
                    const u = users.find((user) => user.id === uid);
                    return u?.full_name.toLowerCase().includes(q);
                  });
                  if (!matchTitle && !matchAssignees) return false;
                }
                return true;
              });

              // Project Total Tracked Time & Value
              const projectTotalSeconds = projTasks.reduce((s, t) => s + (t.tracked_seconds || 0), 0);
              const projectTotalHours = Math.round((projectTotalSeconds / 3600) * 10) / 10;
              const hourlyRate = project.hourly_rate || 0;
              const projectBillables = projectTotalHours * hourlyRate;
              const client = project.client_id ? clientMap.get(project.client_id) : null;
              const baseCurrency = project.currency || "$";

              return (
                <div
                  key={project.id}
                  className="w-80 shrink-0 rounded-2xl border border-border/80 bg-card/70 flex flex-col shadow-xs overflow-hidden"
                >
                  {/* Project Column Header */}
                  <div className="p-3.5 border-b border-border/70 bg-muted/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color || "#3b82f6" }}
                        />
                        <h3
                          onClick={() => {
                            setSelectedProjectId(project.id);
                            setActiveView("project_detail");
                          }}
                          className="font-bold text-xs text-foreground truncate hover:text-primary cursor-pointer"
                          title="Open Project"
                        >
                          {project.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                        {projTasks.length} {projTasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>

                    {/* Client & Rate Information */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1 truncate max-w-[150px]">
                        {client ? (
                          <>
                            <ClientAvatar client={client} size="xs" />
                            <span className="truncate">{client.name}</span>
                          </>
                        ) : (
                          <span className="italic text-[10px] text-muted-foreground/60">Internal Project</span>
                        )}
                      </div>
                      <span className="font-semibold text-foreground/80">
                        {formatCurrencyAmount(hourlyRate, baseCurrency)}/hr
                      </span>
                    </div>

                    {/* Column Duration & Value Totals */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-background/80 border border-border/60 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Tracked Labor</span>
                        <span className="font-bold font-mono text-foreground">{projectTotalHours} hrs</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Billable Value</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrencyAmount(projectBillables, baseCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List inside this Project Column */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] flex-1">
                    {projTasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground/60">
                        No tasks match criteria.
                      </div>
                    ) : (
                      projTasks.map((task) => {
                        const isTimerRunningOnThisTask = activeTimer?.taskId === task.id;
                        const taskSeconds = isTimerRunningOnThisTask
                          ? (task.tracked_seconds || 0) + activeTimer.seconds
                          : task.tracked_seconds || 0;
                        const taskHours = Math.round((taskSeconds / 3600) * 10) / 10;
                        const taskBillables = (taskSeconds / 3600) * hourlyRate;
                        const estimated = task.estimated_hours || 0;
                        const progressPercent = estimated > 0 ? Math.min(100, (taskHours / estimated) * 100) : 0;

                        // Task Assignees
                        const assignees = (task.assignee_ids || [])
                          .map((uid) => users.find((u) => u.id === uid))
                          .filter(Boolean) as User[];

                        return (
                          <div
                            key={task.id}
                            className={`p-3 rounded-xl border text-xs transition-all shadow-xs group ${
                              isTimerRunningOnThisTask
                                ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                                : "bg-card border-border/70 hover:border-border hover:shadow-sm"
                            }`}
                          >
                            {/* Task Top Meta: Department & Status */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-secondary/80 text-foreground truncate max-w-[140px]">
                                {task.department || "General"}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  task.status === "done"
                                    ? "bg-emerald-500/15 text-emerald-600"
                                    : "bg-blue-500/15 text-blue-600"
                                }`}
                              >
                                {task.status.toUpperCase()}
                              </span>
                            </div>

                            {/* Task Title */}
                            <h4 className="font-semibold text-foreground text-xs leading-snug line-clamp-2 mb-2">
                              {task.title}
                            </h4>

                            {/* Time Monospace Counter Badge */}
                            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/50 mb-2">
                              <div className="flex items-center space-x-1.5">
                                <Clock className={`w-3.5 h-3.5 ${isTimerRunningOnThisTask ? "text-emerald-500 animate-spin" : "text-muted-foreground"}`} />
                                <span className="font-mono font-bold text-xs text-foreground">
                                  {formatDuration(taskSeconds)}
                                </span>
                              </div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                {formatCurrencyAmount(taskBillables, baseCurrency)}
                              </span>
                            </div>

                            {/* Estimate Progress Bar */}
                            {estimated > 0 && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                  <span>{taskHours} of {estimated} hrs est.</span>
                                  <span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      taskHours > estimated ? "bg-amber-500" : "bg-primary"
                                    }`}
                                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Assignee Avatars & Controls */}
                            <div className="flex items-center justify-between pt-1 border-t border-border/40">
                              {/* Assignees */}
                              <div className="flex items-center -space-x-1.5 overflow-hidden">
                                {assignees.slice(0, 3).map((u) => (
                                  <UserAvatar key={u.id} user={u} size="xs" />
                                ))}
                                {assignees.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground pl-1">
                                    +{assignees.length - 3}
                                  </span>
                                )}
                              </div>

                              {/* Interactive Stopwatch / Actions Buttons */}
                              <div className="flex items-center space-x-1">
                                {/* Quick Manual Log Button */}
                                <button
                                  onClick={() => openLogTimeForTask(task.id)}
                                  title="Log Manual Time"
                                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {/* Play / Stop Stopwatch Button */}
                                {isTimerRunningOnThisTask ? (
                                  <button
                                    onClick={() => stopTimer()}
                                    title="Stop Timer"
                                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-rose-500 text-white font-bold text-[10px] hover:bg-rose-600 transition-all shadow-xs animate-pulse cursor-pointer"
                                  >
                                    <Square className="w-2.5 h-2.5 fill-white" />
                                    <span>Stop</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startTimer(task.id)}
                                    title="Start Stopwatch Timer"
                                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white font-bold text-[10px] transition-all cursor-pointer"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Start</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: Detailed Time Sessions Feed / Table */}
      {viewMode === "detailed_logs" && (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                <tr>
                  <th className="py-3 px-4">Task & Project</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Work summary</th>
                  <th className="py-3 px-4">Billable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {timeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0"><EmptyState className="border-0 rounded-none shadow-none" icon={Clock} title="Make your time count" description="Start the project timeclock or log time against a task. Your work summaries will appear here." actionLabel={tasks.length > 0 ? "Log time" : undefined} onAction={tasks.length > 0 ? () => openLogTimeForTask(tasks[0].id) : undefined} /></td>
                  </tr>
                ) : (
                  timeEntries.map((entry) => {
                    const task = tasks.find((t) => t.id === entry.task_id);
                    const proj = projects.find((p) => p.id === (entry.project_id || task?.project_id));
                    const user = users.find((u) => u.id === entry.user_id) || entry.user;

                    return (
                      <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div>{entry.task_title || task?.title || "Project time"}</div>
                          <div className="text-[11px] text-muted-foreground">{proj?.name || "No Project"}</div>
                        </td>
                        <td className="py-3 px-4">
                          {user ? (
                            <div className="flex items-center space-x-2">
                              <UserAvatar user={user} size="xs" />
                              <span className="font-medium">{user.full_name}</span>
                            </div>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {formatDuration(entry.duration_seconds || 0)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-[11px]">
                          {formatDate(entry.started_at)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-[11px] max-w-xs truncate">
                          {entry.work_summary || entry.description || "Timer Session"}
                        </td>
                        <td className="py-3 px-4">
                          {entry.is_billable ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                              Billable
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                              Non-billable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Log Time Modal */}
      <AnimatePresence>
        {isLogTimeModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsLogTimeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 420 }}
              className="w-full max-w-md max-h-[88vh] bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-card-foreground cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Log Work Time</h3>
                    <p className="text-[11px] text-muted-foreground">Record labor hours on a project task</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLogTimeModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveManualTime} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto text-xs">
                {/* Select Task */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Target Task</label>
                  <select
                    value={modalTaskId}
                    onChange={(e) => setModalTaskId(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    <option value="">Select a task...</option>
                    {tasks.map((t) => {
                      const p = projects.find((proj) => proj.id === t.project_id);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.title} {p ? `(${p.name})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Log Date Selection (Today / Yesterday / Custom) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Entry Date</span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setModalDate(todayStr)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          modalDate === todayStr ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDate(yesterdayStr)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          modalDate === yesterdayStr ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        Yesterday
                      </button>
                    </div>
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs font-mono"
                  />
                </div>

                {/* Duration inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={modalHours}
                      onChange={(e) => setModalHours(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={modalMinutes}
                      onChange={(e) => setModalMinutes(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs font-mono"
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Work Performed Note (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of work done..."
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none shadow-xs"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-2 px-5 py-3 border-t border-border/60 bg-secondary/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLogTimeModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Log</span>
                </button>
              </div>
            </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
