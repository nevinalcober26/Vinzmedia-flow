"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useToast, useConfirm } from "@/context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
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
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Link as LinkIcon,
  Search,
  AtSign,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Role, User } from "@/types";

export function TeamView() {
  const {
    users,
    currentUser,
    tasks,
    pendingApprovals,
    activeInvites,
    createInviteLink,
    approveMember,
    rejectMember,
    revokeInvite,
    updateMemberRole,
    removeMember,
  } = useStore();

  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<"directory" | "approvals" | "invites">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [hasCopied, setHasCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const canManageRoles = ["owner", "admin"].includes(currentUser.role);

  const filteredMembers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      u.role.toLowerCase().includes(query)
    );
  });

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await createInviteLink(inviteEmail.trim(), inviteRole);
      setGeneratedLink(res.inviteUrl);
      toast.success(
        "Invite Link Generated!",
        "Share this link with your teammate to let them register."
      );
    } catch {
      toast.error("Failed to generate invitation link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setHasCopied(true);
      toast.success("Copied to Clipboard!", "Invite URL copied.");
      setTimeout(() => setHasCopied(false), 2500);
    }
  };

  const handleApprove = async (applicant: User) => {
    const success = await approveMember(applicant);
    if (success) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    }
  };

  const handleReject = (applicant: User) => {
    confirm({
      title: "Reject Registration Request?",
      message: `Are you sure you want to dismiss the registration request for ${applicant.full_name} (${applicant.email})?`,
      confirmText: "Reject & Dismiss",
      variant: "danger",
      onConfirm: async () => {
        await rejectMember(applicant.id, applicant.email);
      },
    });
  };

  const handleRemoveMember = (member: User) => {
    confirm({
      title: "Remove Team Member?",
      message: `Are you sure you want to remove ${member.full_name} from the workspace? They will lose access to all projects and tasks.`,
      confirmText: "Remove Member",
      variant: "danger",
      onConfirm: () => {
        removeMember(member.id);
      },
    });
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "online":
        return "bg-emerald-500 ring-emerald-500/30";
      case "busy":
        return "bg-rose-500 ring-rose-500/30";
      case "away":
        return "bg-amber-500 ring-amber-500/30";
      default:
        return "bg-slate-400 ring-slate-400/30";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center space-x-2">
            <span>Team & Access Control</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
              RBAC
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage workspace members, review onboarding requests, and configure roles
          </p>
        </div>

        {canManageRoles && (
          <button
            onClick={() => {
              setGeneratedLink("");
              setInviteEmail("");
              setIsInviteModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Teammate</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-1 border-b border-border/60 pb-1">
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "directory"
              ? "bg-secondary text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Active Members</span>
          <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-background text-[10px] font-mono border border-border">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("approvals")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
            activeTab === "approvals"
              ? "bg-secondary text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Pending Approvals</span>
          {pendingApprovals.length > 0 ? (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-amber-950 font-bold text-[10px] animate-pulse">
              {pendingApprovals.length}
            </span>
          ) : (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-background text-[10px] font-mono border border-border">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("invites")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "invites"
              ? "bg-secondary text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Invitation Links</span>
          <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-background text-[10px] font-mono border border-border">
            {activeInvites.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ACTIVE DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3.5 py-1.5 rounded-xl border border-border bg-card/60 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Showing <strong>{filteredMembers.length}</strong> active members
            </p>
          </div>

          {/* Members Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            <AnimatePresence>
              {filteredMembers.map((member) => {
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
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-5 flex flex-col justify-between shadow-2xs hover:shadow-lg hover:border-border transition-all group"
                  >
                    <div>
                      {/* Avatar and status header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="relative">
                          <img
                            src={
                              member.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                member.full_name
                              )}`
                            }
                            alt={member.full_name}
                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-border/80 shadow-xs"
                          />
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-card ${getStatusDot(
                              member.status
                            )}`}
                          />
                        </div>

                        {/* Role Selector or Badge */}
                        <div className="flex items-center space-x-1.5">
                          {canManageRoles && member.id !== currentUser.id ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                updateMemberRole(member.id, e.target.value as Role)
                              }
                              className="bg-secondary/70 text-[11px] font-semibold rounded-xl px-2.5 py-1 text-foreground border border-border capitalize focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer hover:bg-secondary"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="project_manager">Project Manager</option>
                              <option value="member">Member</option>
                              <option value="guest">Guest</option>
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-primary/10 text-primary capitalize border border-primary/20">
                              {member.role.replace("_", " ")}
                            </span>
                          )}

                          {canManageRoles && member.id !== currentUser.id && (
                            <button
                              onClick={() => handleRemoveMember(member)}
                              title="Remove member"
                              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Name & Title */}
                      <h3 className="text-sm font-bold text-foreground flex items-center space-x-1.5">
                        <span>{member.full_name}</span>
                        {member.username && (
                          <span className="text-[11px] font-mono text-muted-foreground font-normal">
                            @{member.username}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center space-x-1.5 mt-0.5">
                        <Briefcase className="w-3 h-3 text-muted-foreground/70" />
                        <span>{member.title || "Team Member"}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 flex items-center space-x-1.5 mt-1">
                        <Mail className="w-3 h-3 text-muted-foreground/70" />
                        <span className="truncate">{member.email}</span>
                      </p>
                    </div>

                    {/* Workload Stats */}
                    <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-secondary/40 p-2 rounded-xl">
                        <span className="block font-bold text-foreground font-mono">
                          {memberTasks.length}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Assigned</span>
                      </div>
                      <div className="bg-secondary/40 p-2 rounded-xl">
                        <span className="block font-bold text-indigo-400 font-mono">
                          {inProgressCount}
                        </span>
                        <span className="text-[10px] text-muted-foreground">In Progress</span>
                      </div>
                      <div className="bg-secondary/40 p-2 rounded-xl">
                        <span className="block font-bold text-emerald-400 font-mono">
                          {completedCount}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Completed</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING APPROVALS */}
      {activeTab === "approvals" && (
        <div className="space-y-4 flex-1">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start space-x-3">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Administrator Review Queue</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                When new teammates register using an invitation link, their accounts remain in this queue. Once approved by an Admin or Owner, their default role becomes <strong>Member</strong> and they gain instant login access.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No Pending Approvals</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                All team registrations have been processed. New invitees will appear here after setting their username and password.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {pendingApprovals.map((applicant) => (
                  <motion.div
                    key={applicant.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-2xl border border-border bg-card p-5 shadow-md flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3.5">
                        <img
                          src={
                            applicant.avatar_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              applicant.full_name
                            )}`
                          }
                          alt={applicant.full_name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-500/30"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-foreground flex items-center space-x-1.5">
                            <span>{applicant.full_name}</span>
                            {applicant.username && (
                              <span className="text-xs font-mono text-muted-foreground">
                                @{applicant.username}
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center space-x-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span>{applicant.email}</span>
                          </p>
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-500 mt-2 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Awaiting Member Approval</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleReject(applicant)}
                        className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-rose-500/10 hover:border-rose-500/30 text-rose-500 text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleApprove(applicant)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve as Member</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVITATION LINKS */}
      {activeTab === "invites" && (
        <div className="space-y-4 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-secondary/40 border border-border/60">
            <div>
              <h4 className="text-xs font-bold text-foreground">Active Workspace Invite Links</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Share these links with new teammates. They can create their username and password directly.
              </p>
            </div>

            <button
              onClick={() => {
                setGeneratedLink("");
                setInviteEmail("");
                setIsInviteModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New Link</span>
            </button>
          </div>

          {activeInvites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <LinkIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No Active Invitation Links</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Generate an invitation link to onboard new teammates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeInvites.map((inv) => {
                const inviteUrl =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/invite?token=${inv.token}`
                    : `http://localhost:3000/invite?token=${inv.token}`;

                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-foreground">
                          {inv.email || "Open Invitation Link"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono capitalize">
                          {inv.role}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        {inviteUrl}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => copyToClipboard(inviteUrl)}
                        className="px-3 py-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </button>

                      <button
                        onClick={() => revokeInvite(inv.id)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Revoke link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Invite Teammate Modal */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground animate-in zoom-in-95 space-y-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Invite Teammate</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleGenerateInvite} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="colleague@vinzmedia.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    You can restrict this invite to an email, or leave blank to share an open registration link.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Target Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground capitalize"
                  >
                    <option value="member">Member — Standard task & project contributor</option>
                    <option value="project_manager">Project Manager — Create and manage projects</option>
                    <option value="admin">Admin — Full workspace administrative control</option>
                    <option value="guest">Guest — Read-only observation</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">How it works:</p>
                  <p>
                    1. They click your link and set their <strong>Full Name</strong>, <strong>@username</strong>, and <strong>Password</strong>.
                  </p>
                  <p>
                    2. Their request arrives in your <strong>Pending Approvals</strong> tab.
                  </p>
                  <p>
                    3. You click <strong>Approve</strong>, activating their Member login!
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 text-xs text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    {isGenerating ? "Generating Link..." : "Generate Invitation Link"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">Invitation Link Ready!</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Shareable URL</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink)}
                      className="px-3.5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shrink-0 shadow-sm hover:bg-primary/90 transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      {hasCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center space-x-1"
                  >
                    <span>Preview Onboarding Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
