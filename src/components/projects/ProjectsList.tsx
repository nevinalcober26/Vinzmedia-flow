"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  FolderKanban,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  formatDate,
  getPriorityBadgeColor,
  getProjectStatusBadge,
} from "@/lib/utils";

export function ProjectsList() {
  const {
    projects,
    tasks,
    users,
    setSelectedProjectId,
    setIsCreateProjectModalOpen,
    duplicateProject,
    archiveProject,
    deleteProject,
  } = useStore();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-foreground">Projects Workspace</h2>
          <p className="text-xs text-muted-foreground">
            Centralized hub for all active and planned initiatives
          </p>
        </div>

        <button
          onClick={() => setIsCreateProjectModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
        {projects.map((proj) => {
          const projTasks = tasks.filter((t) => t.project_id === proj.id);
          const doneTasks = projTasks.filter((t) => t.status === "done").length;
          const statusBadge = getProjectStatusBadge(proj.status);
          const priorityBadge = getPriorityBadgeColor(proj.priority);
          const assignedMembers = users.filter((u) =>
            (proj.member_ids || []).includes(u.id)
          );

          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all cursor-pointer group hover:border-border relative"
            >
              <div>
                {/* Header: Color pill, Status & Menu */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3.5 h-3.5 rounded-md shadow-xs flex-shrink-0"
                      style={{ backgroundColor: proj.color }}
                    />
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityBadge.bg} ${priorityBadge.text} ${priorityBadge.border} capitalize`}
                    >
                      {proj.priority}
                    </span>
                  </div>

                  {/* Actions Dropdown */}
                  <div
                    className="relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === proj.id ? null : proj.id);
                    }}
                  >
                    <button className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {activeMenuId === proj.id && (
                      <div
                        className="absolute right-0 top-6 w-36 rounded-xl bg-card border border-border shadow-xl py-1 z-50 text-xs animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            duplicateProject(proj.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center space-x-1.5 text-foreground"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={() => {
                            archiveProject(proj.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center space-x-1.5 text-foreground"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this project and all its tasks?")) {
                              deleteProject(proj.id);
                            }
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 flex items-center space-x-1.5 text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {proj.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                  {proj.description || "No project description provided."}
                </p>
              </div>

              {/* Progress & Stats Bottom */}
              <div className="mt-5 space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">
                      {doneTasks} of {projTasks.length} tasks completed
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {proj.progress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: proj.color,
                        width: `${proj.progress}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Footer: Target date & Team Avatars */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due {formatDate(proj.target_date)}</span>
                  </div>

                  <div className="flex items-center -space-x-1.5">
                    {assignedMembers.slice(0, 4).map((m) => (
                      <img
                        key={m.id}
                        src={m.avatar_url}
                        alt={m.full_name}
                        title={m.full_name}
                        className="w-5 h-5 rounded-full object-cover ring-2 ring-card shadow-2xs"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
