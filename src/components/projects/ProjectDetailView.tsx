"use client";

import React from "react";
import { useStore } from "@/context/StoreContext";
import {
  LayoutDashboard,
  Kanban,
  List as ListIcon,
  Calendar,
  Clock,
  Paperclip,
  StickyNote,
  Activity,
  Plus,
  CheckCircle2,
  Flag,
  Users,
  Settings,
  ArrowLeft,
  CalendarDays,
  FileText,
  BarChart3,
} from "lucide-react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ListView } from "@/components/tasks/ListView";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TimelineGanttView } from "@/components/timeline/TimelineGanttView";
import { ClientsFilesView } from "@/components/files/ClientsFilesView";
import { ProjectSubTab } from "@/types";
import { formatDate, getPriorityBadgeColor, getProjectStatusBadge } from "@/lib/utils";

export function ProjectDetailView() {
  const {
    activeProject,
    projectSubTab,
    setProjectSubTab,
    setSelectedProjectId,
    setActiveView,
    tasks,
    files,
    users,
    notes,
    activityLogs,
    setIsCreateTaskModalOpen,
  } = useStore();

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-sm text-muted-foreground mb-4">No project selected</p>
        <button
          onClick={() => setActiveView("projects")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const projectTasks = tasks.filter((t) => t.project_id === activeProject.id);
  const doneTasks = projectTasks.filter((t) => t.status === "done").length;
  const projectNotes = notes.filter((n) => n.project_id === activeProject.id);
  const projectLogs = activityLogs.filter((l) => l.project_id === activeProject.id);
  const projectFiles = files.filter((f) => f.project_id === activeProject.id);

  const tabs: { id: ProjectSubTab; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "board", label: "Board", icon: Kanban, count: projectTasks.length },
    { id: "list", label: "List", icon: ListIcon },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "timeline", label: "Gantt Timeline", icon: BarChart3 },
    { id: "files", label: "Files & Media", icon: Paperclip, count: projectFiles.length },
    { id: "notes", label: "Notes", icon: StickyNote, count: projectNotes.length },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  const statusBadge = getProjectStatusBadge(activeProject.status);
  const priorityBadge = getPriorityBadgeColor(activeProject.priority);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Project Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSelectedProjectId(null);
              setActiveView("projects");
            }}
            title="Back to all projects"
            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <span
            className="w-4 h-4 rounded-md shadow-xs flex-shrink-0"
            style={{ backgroundColor: activeProject.color }}
          />

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-foreground">{activeProject.name}</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityBadge.bg} ${priorityBadge.text} ${priorityBadge.border} capitalize`}
              >
                {activeProject.priority}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {activeProject.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-1 border-b border-border/40 overflow-x-auto pb-1 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = projectSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setProjectSubTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-secondary text-foreground font-semibold shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Rendering */}
      <div className="flex-1 overflow-hidden">
        {projectSubTab === "overview" && (
          <div className="h-full overflow-y-auto space-y-6 max-w-5xl">
            {/* Metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Completion</span>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {activeProject.progress}%
                </p>
                <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: activeProject.color,
                      width: `${activeProject.progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Total Tasks</span>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {doneTasks} / {projectTasks.length}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Done vs Pending</p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Target Date</span>
                <p className="text-sm font-bold text-foreground mt-1">
                  {formatDate(activeProject.target_date)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Started {formatDate(activeProject.start_date)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Project Team</span>
                <p className="text-sm font-bold text-foreground mt-1">
                  {activeProject.member_ids?.length || 1} Members
                </p>
                <div className="flex items-center -space-x-1.5 mt-2">
                  {users
                    .filter((u) => (activeProject.member_ids || []).includes(u.id))
                    .map((u) => (
                      <img
                        key={u.id}
                        src={u.avatar_url}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover ring-2 ring-card"
                      />
                    ))}
                </div>
              </div>
            </div>

            {/* Milestones Card */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flag className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-bold text-foreground">Project Milestones</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activeProject.milestones?.filter((m) => m.completed).length || 0} of{" "}
                  {activeProject.milestones?.length || 0} completed
                </span>
              </div>

              <div className="divide-y divide-border/40">
                {(activeProject.milestones || []).map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-2 h-2 rounded-full ${m.completed ? "bg-emerald-500" : "bg-purple-500"}`} />
                      <span className={`font-medium ${m.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {m.title}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono">
                      Target: {formatDate(m.target_date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description & Objective details */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <h3 className="text-sm font-bold text-foreground">Project Scope & Details</h3>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {activeProject.description}
              </p>
            </div>
          </div>
        )}

        {projectSubTab === "board" && <KanbanBoard projectId={activeProject.id} />}
        {projectSubTab === "list" && <ListView projectId={activeProject.id} />}
        {projectSubTab === "calendar" && <CalendarView projectId={activeProject.id} />}
        {projectSubTab === "timeline" && <TimelineGanttView projectId={activeProject.id} />}
        {projectSubTab === "files" && (
          <div className="h-full overflow-hidden">
            <ClientsFilesView initialProjectId={activeProject.id} hideClientTab={true} />
          </div>
        )}

        {projectSubTab === "notes" && (
          <div className="h-full overflow-y-auto space-y-3 max-w-4xl">
            {projectNotes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-xs">
                <StickyNote className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p>No notes linked to this project yet.</p>
              </div>
            ) : (
              projectNotes.map((note) => (
                <div key={note.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <h4 className="text-sm font-bold text-foreground">{note.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap font-sans">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {projectSubTab === "activity" && (
          <div className="h-full overflow-y-auto space-y-2 max-w-3xl">
            {projectLogs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-xs">
                No recent activity for this project.
              </div>
            ) : (
              projectLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
                  <span className="text-foreground">{log.details}</span>
                  <span className="text-[10px] text-muted-foreground">{log.created_at.split("T")[0]}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
