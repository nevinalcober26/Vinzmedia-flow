"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm } from "@/context/ToastContext";
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
import { UserAvatar } from "@/components/common/UserAvatar";
import { ClientAvatar } from "@/components/common/ClientAvatar";

export function ProjectsList() {
  const confirm = useConfirm();
  const {
    projects,
    tasks,
    users,
    clients,
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

      {/* Projects Grid or Clean Empty State */}
      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/80 rounded-2xl p-12 text-center my-auto">
          <FolderKanban className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Projects Created Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Get started by creating your first project to organize sprints, manage tasks, and track team progress.
          </p>
          <button
            onClick={() => setIsCreateProjectModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
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
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }}
                        />
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
                              setActiveMenuId(null);
                              confirm({
                                title: "Delete Project?",
                                message: `Are you sure you want to delete "${proj.name}" and all its tasks? This action cannot be undone.`,
                                confirmText: "Delete Project",
                                variant: "danger",
                                onConfirm: () => {
                                  deleteProject(proj.id);
                                },
                              });
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 flex items-center space-x-1.5 text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
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

                {/* Linked Client Badge with Letter Avatar */}
                {(() => {
                  const client = clients.find((c) => c.id === proj.client_id);
                  if (!client) return null;
                  return (
                    <div className="flex items-center space-x-2 mt-3 pt-2.5 border-t border-border/40">
                      <ClientAvatar client={client} size="xs" rounded="md" />
                      <span className="text-[11px] font-semibold text-foreground/80 truncate">
                        {client.company || client.name}
                      </span>
                    </div>
                  );
                })()}
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
                      <UserAvatar
                        key={m.id}
                        name={m.full_name}
                        avatarUrl={m.avatar_url}
                        size="xs"
                        className="ring-2 ring-card shadow-2xs"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
