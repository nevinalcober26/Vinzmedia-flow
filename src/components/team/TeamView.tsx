"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  CheckCircle2,
  Trash2,
  X,
  Clock,
  Briefcase,
  Activity,
} from "lucide-react";
import { Role } from "@/types";

export function TeamView() {
  const {
    users,
    currentUser,
    tasks,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useStore();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const canManageRoles = ["owner", "admin"].includes(currentUser.role);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMember(inviteEmail.trim(), inviteRole);
    setInviteEmail("");
    setIsInviteOpen(false);
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "online":
        return "bg-emerald-500 ring-emerald-500/30";
      case "busy":
        return "bg-red-500 ring-red-500/30";
      case "away":
        return "bg-amber-500 ring-amber-500/30";
      default:
        return "bg-slate-400 ring-slate-400/30";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-foreground">Team & Permissions</h2>
          <p className="text-xs text-muted-foreground">
            Manage workspace members, role assignments, and team workload
          </p>
        </div>

        {canManageRoles && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Teammate</span>
          </button>
        )}
      </div>

      {/* Team Cards Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
        {users.map((member) => {
          const memberTasks = tasks.filter((t) =>
            (t.assignee_ids || []).includes(member.id)
          );
          const inProgressCount = memberTasks.filter(
            (t) => t.status === "in_progress"
          ).length;
          const completedCount = memberTasks.filter(
            (t) => t.status === "done"
          ).length;

          return (
            <div
              key={member.id}
              className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all"
            >
              <div>
                {/* Avatar and status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-border shadow-xs"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-card ${getStatusDot(
                        member.status
                      )}`}
                    />
                  </div>

                  {/* Role Selector or Badge */}
                  {canManageRoles && member.id !== currentUser.id ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        updateMemberRole(member.id, e.target.value as Role)
                      }
                      className="bg-secondary text-[11px] font-semibold rounded-lg px-2 py-1 text-foreground border border-border capitalize focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="member">Member</option>
                      <option value="guest">Guest</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary capitalize border border-primary/20">
                      {member.role.replace("_", " ")}
                    </span>
                  )}
                </div>

                {/* Name & Title */}
                <h3 className="text-sm font-bold text-foreground">
                  {member.full_name}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center space-x-1.5 mt-0.5">
                  <Briefcase className="w-3 h-3" />
                  <span>{member.title || "Software Engineer"}</span>
                </p>
                <p className="text-[11px] text-muted-foreground/80 flex items-center space-x-1.5 mt-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{member.email}</span>
                </p>
              </div>

              {/* Workload Stats */}
              <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-secondary/40 p-2 rounded-xl">
                  <span className="block font-bold text-foreground font-mono">
                    {memberTasks.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Assigned</span>
                </div>
                <div className="bg-secondary/40 p-2 rounded-xl">
                  <span className="block font-bold text-indigo-500 font-mono">
                    {inProgressCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">In Progress</span>
                </div>
                <div className="bg-secondary/40 p-2 rounded-xl">
                  <span className="block font-bold text-emerald-500 font-mono">
                    {completedCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Completed</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsInviteOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Invite New Teammate</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@vinzmedia.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-2 text-xs text-foreground capitalize"
                >
                  <option value="admin">Admin — Full workspace control</option>
                  <option value="project_manager">Project Manager — Manage projects & tasks</option>
                  <option value="member">Member — Create and update assigned tasks</option>
                  <option value="guest">Guest — Read-only access</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs text-muted-foreground hover:bg-secondary rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteEmail.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
