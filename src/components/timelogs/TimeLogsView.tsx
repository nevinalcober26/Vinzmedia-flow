"use client";

import React, { useState, useMemo } from "react";
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
  ChevronDown,
  Layers,
  Sparkles,
  Timer,
  Building2,
  Trash2,
  History,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { Task, Project, TimeEntry, User } from "@/types";
import { formatDuration, formatTimerDisplay, formatDate, formatRelativeTime } from "@/lib/utils";
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
  } = useStore();
  const toast = useToast();

  // View & Filter states
  const [viewMode, setViewMode] = useState<"project_columns" | "assignee_columns" | "detailed_logs">("project_columns");
  const [search, setSearch] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>("all");
  const [hideZeroHours, setHideZeroHours] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Manual Log Time Modal state
  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false);
  const [modalTaskId, setModalTaskId] = useState<string>("");
  const [modalHours, setModalHours] = useState<string>("1");
  const [modalMinutes, setModalMinutes] = useState<string>("30");
  const [modalNote, setModalNote] = useState<string>("");

  // Quick Open Modal for specific task
  const openLogTimeForTask = (taskId: string) => {
    setModalTaskId(taskId);
    setModalHours("1");
    setModalMinutes("0");
    setModalNote("");
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

    addManualTimeEntry(modalTaskId, totalMinutes, modalNote.trim() || undefined);
    toast.success("Time Logged!", `Added ${totalMinutes}m to task.`);
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
                {kpis.totalHours} hrs Total
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Monitor active stopwatches, task duration, and billable labor organized by project columns
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-secondary/50 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setViewMode("project_columns")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                viewMode === "project_columns"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Project Columns
            </button>
            <button
              onClick={() => setViewMode("detailed_logs")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
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
                onClick={stopTimer}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop & Save Session</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Tracked Time */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Total Time Tracked</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {kpis.totalHours} hrs
            </span>
            <span className="text-xs text-muted-foreground">({formatDuration(kpis.totalSeconds)})</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-indigo-500" />
            Across {kpis.tasksWithTime} recorded tasks
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 opacity-60" />
        </div>

        {/* Card 2: Accrued Billables */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Accrued Labor Value</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              ${kpis.totalBillableValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            Calculated via project hourly rates
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 opacity-60" />
        </div>

        {/* Card 3: Active Live Timers */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Active Timers</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {activeTimer ? "1 Running" : "0 Running"}
            </span>
            {activeTimer && (
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            {activeTimer ? `Tracking "${activeTimer.taskTitle.slice(0, 20)}..."` : "No active stopwatch running"}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 opacity-60" />
        </div>

        {/* Card 4: Logged Sessions Count */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Recorded Sessions</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {timeEntries.length} Sessions
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <CheckSquare className="w-3 h-3 text-purple-500" />
            Stored in workspace database
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 opacity-60" />
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/70 p-2.5 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks or assignees..."
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

          {/* Department Filter */}
          <select
            value={selectedDepartmentFilter}
            onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
            className="text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="all">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Design & Creative">Design & Creative</option>
            <option value="Marketing & Growth">Marketing & Growth</option>
            <option value="Product Management">Product Management</option>
            <option value="QA & Security">QA & Security</option>
          </select>
        </div>

        {/* Toggle hide 0 hrs tasks */}
        <label className="flex items-center space-x-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideZeroHours}
            onChange={(e) => setHideZeroHours(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
          />
          <span>Only show tasks with logged time</span>
        </label>
      </div>

      {/* VIEW 1: Project Columns Board (The Requested Layout) */}
      {viewMode === "project_columns" && (
        <div className="flex-1 overflow-x-auto pb-4">
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
                        const isExpanded = expandedTaskId === task.id;

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
                                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {/* Play / Stop Stopwatch Button */}
                                {isTimerRunningOnThisTask ? (
                                  <button
                                    onClick={stopTimer}
                                    title="Stop Timer"
                                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-rose-500 text-white font-bold text-[10px] hover:bg-rose-600 transition-all shadow-xs animate-pulse"
                                  >
                                    <Square className="w-2.5 h-2.5 fill-white" />
                                    <span>Stop</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startTimer(task.id)}
                                    title="Start Stopwatch Timer"
                                    className="flex items-center space-x-1 px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white font-bold text-[10px] transition-all"
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

      {/* VIEW 2: Detailed Time Sessions Feed / Table */}
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
                  <th className="py-3 px-4">Note / Description</th>
                  <th className="py-3 px-4">Billable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {timeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No time entries logged yet. Start a timer or click &quot;Log Time&quot; above.
                    </td>
                  </tr>
                ) : (
                  timeEntries.map((entry) => {
                    const task = tasks.find((t) => t.id === entry.task_id);
                    const proj = projects.find((p) => p.id === (entry.project_id || task?.project_id));
                    const user = users.find((u) => u.id === entry.user_id) || entry.user;

                    return (
                      <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div>{entry.task_title || task?.title || "Workspace Task"}</div>
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
                          {entry.description || "Timer Session"}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsLogTimeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 420 }}
              className="w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-card-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Log Work Time</h3>
                    <p className="text-[11px] text-muted-foreground">Record completed labor on a project task</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLogTimeModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveManualTime} className="p-6 space-y-4 text-xs">
                {/* Select Task */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Target Task</label>
                  <select
                    value={modalTaskId}
                    onChange={(e) => setModalTaskId(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
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
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Work Performed Note (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of work done..."
                    value={modalNote}
                    onChange={(e) => setModalNote(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none shadow-xs"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setIsLogTimeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
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
