"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Megaphone,
  StickyNote,
  Plus,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import {
  formatDate,
  formatDuration,
  formatRelativeTime,
  getPriorityBadgeColor,
  isOverdue,
} from "@/lib/utils";

export function MainDashboard() {
  const {
    projects,
    tasks,
    currentUser,
    activityLogs,
    notes,
    announcements,
    setEditingTask,
    setSelectedProjectId,
    setActiveView,
    setIsCreateTaskModalOpen,
    setIsCreateProjectModalOpen,
    setIsQuickNoteOpen,
  } = useStore();

  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  // Computed metrics
  const activeProjects = projects.filter((p) => p.status === "active");
  const myTasks = tasks.filter((t) => (t.assignee_ids || []).includes(currentUser.id));
  const myPendingTasks = myTasks.filter((t) => t.status !== "done");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "done");
  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date, t.status));

  // Upcoming deadlines (within next 7 days)
  const upcomingDeadlines = tasks
    .filter((t) => t.due_date && t.status !== "done" && !isOverdue(t.due_date, t.status))
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, 5);

  // Overall completion percentage
  const totalTasksCount = tasks.length;
  const overallCompletion =
    totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;

  // Status distribution count
  const statusDistribution = {
    backlog: tasks.filter((t) => t.status === "backlog").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    in_review: tasks.filter((t) => t.status === "in_review").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="flex flex-col h-full space-y-6 overflow-y-auto pr-1 pb-10">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-indigo-500/5 border border-primary/20 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-foreground">
              Welcome back, {currentUser.full_name}! 👋
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/20 text-primary capitalize">
              {currentUser.role.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            You have <span className="font-semibold text-foreground">{myPendingTasks.length} pending tasks</span> across {activeProjects.length} active initiatives.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsQuickNoteOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-xs font-medium text-foreground transition-colors shadow-2xs flex items-center space-x-1.5"
          >
            <StickyNote className="w-3.5 h-3.5 text-primary" />
            <span>Scratchpad</span>
          </button>
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Active Projects */}
        <div
          onClick={() => setActiveView("projects")}
          className="p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Active Projects</span>
            <FolderKanban className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{activeProjects.length}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {projects.length} total projects
          </span>
        </div>

        {/* My Tasks */}
        <div
          onClick={() => setActiveView("my_tasks")}
          className="p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Assigned to Me</span>
            <CheckSquare className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{myTasks.length}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {myPendingTasks.length} pending
          </span>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">In Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{inProgressTasks.length}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">Active development</span>
        </div>

        {/* Completed Tasks */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{completedTasks.length}</p>
          <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
            {overallCompletion}% completion
          </span>
        </div>

        {/* Overdue Tasks */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-red-500">{overdueTasks.length}</p>
          <span className="text-[10px] text-red-500/80 font-medium mt-1 block">
            Requires attention
          </span>
        </div>

        {/* Productivity Score */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Health Index</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">94/100</p>
          <span className="text-[10px] text-purple-600 font-medium mt-1 block">On track</span>
        </div>
      </div>

      {/* Main Grid: Distribution Chart & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Distribution Card */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Task Status Breakdown
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {totalTasksCount} Total Tasks
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden flex">
            <div
              style={{ width: `${(statusDistribution.done / (totalTasksCount || 1)) * 100}%` }}
              className="bg-emerald-500 h-full"
              title={`Done: ${statusDistribution.done}`}
            />
            <div
              style={{
                width: `${(statusDistribution.in_review / (totalTasksCount || 1)) * 100}%`,
              }}
              className="bg-amber-500 h-full"
              title={`In Review: ${statusDistribution.in_review}`}
            />
            <div
              style={{
                width: `${(statusDistribution.in_progress / (totalTasksCount || 1)) * 100}%`,
              }}
              className="bg-indigo-500 h-full"
              title={`In Progress: ${statusDistribution.in_progress}`}
            />
            <div
              style={{ width: `${(statusDistribution.todo / (totalTasksCount || 1)) * 100}%` }}
              className="bg-sky-400 h-full"
              title={`To Do: ${statusDistribution.todo}`}
            />
            <div
              style={{
                width: `${(statusDistribution.backlog / (totalTasksCount || 1)) * 100}%`,
              }}
              className="bg-slate-400 h-full"
              title={`Backlog: ${statusDistribution.backlog}`}
            />
          </div>

          {/* Distribution Legend Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2 text-xs">
            <div className="p-2 rounded-xl bg-secondary/30">
              <span className="flex items-center space-x-1.5 text-muted-foreground text-[10px]">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Backlog</span>
              </span>
              <span className="text-sm font-bold text-foreground font-mono mt-0.5 block">
                {statusDistribution.backlog}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-secondary/30">
              <span className="flex items-center space-x-1.5 text-muted-foreground text-[10px]">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>To Do</span>
              </span>
              <span className="text-sm font-bold text-foreground font-mono mt-0.5 block">
                {statusDistribution.todo}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-secondary/30">
              <span className="flex items-center space-x-1.5 text-muted-foreground text-[10px]">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>In Progress</span>
              </span>
              <span className="text-sm font-bold text-foreground font-mono mt-0.5 block">
                {statusDistribution.in_progress}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-secondary/30">
              <span className="flex items-center space-x-1.5 text-muted-foreground text-[10px]">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>In Review</span>
              </span>
              <span className="text-sm font-bold text-foreground font-mono mt-0.5 block">
                {statusDistribution.in_review}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-secondary/30">
              <span className="flex items-center space-x-1.5 text-muted-foreground text-[10px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Done</span>
              </span>
              <span className="text-sm font-bold text-emerald-500 font-mono mt-0.5 block">
                {statusDistribution.done}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines & Overdue Warning */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Upcoming Deadlines
              </h3>
            </div>
            <button
              onClick={() => setActiveView("calendar")}
              className="text-xs text-primary hover:underline flex items-center space-x-1"
            >
              <span>View Calendar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-border/40">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No upcoming deadlines this week.
              </p>
            ) : (
              upcomingDeadlines.map((task) => {
                const priorityStyle = getPriorityBadgeColor(task.priority);
                return (
                  <div
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className="py-2.5 flex items-center justify-between hover:bg-secondary/40 px-2 rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate max-w-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                      <span className="font-medium text-foreground truncate">{task.title}</span>
                    </div>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {formatDate(task.due_date)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Project Health & Team Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project Health Progress List */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderKanban className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Active Projects & Health
              </h3>
            </div>
            <button
              onClick={() => setActiveView("projects")}
              className="text-xs text-primary hover:underline flex items-center space-x-1"
            >
              <span>All Projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setActiveView("project_detail");
                }}
                className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-semibold text-foreground">{p.name}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{p.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ backgroundColor: p.color, width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Team Activity */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Recent Team Activity
              </h3>
            </div>
            <button
              onClick={() => setActiveView("activity")}
              className="text-xs text-primary hover:underline"
            >
              More
            </button>
          </div>

          <div className="space-y-3">
            {activityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start space-x-2.5 text-xs">
                <img
                  src={log.user?.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground leading-snug font-medium line-clamp-2">
                    {log.details}
                  </p>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {formatRelativeTime(log.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
