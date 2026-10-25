"use client";

import { EmptyState } from "@/components/common/EmptyState";
import React, { useState, useEffect } from "react";
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
import { UserAvatar } from "@/components/common/UserAvatar";
import { Role, User } from "@/types";
import { RoleManagement } from "./RoleManagement";
import { defaultRoleKey } from "@/hooks/useWorkspaceRoles";

export function TeamView() {
  const {
    users,
    currentUser,
    tasks,
    pendingApprovals,
    refreshTeamData,
    activeInvites,
    createInviteLink,
    approveMember,
    rejectMember,
    revokeInvite,
    workspaceRoles,
    roleAssignments,
    assignWorkspaceRole,
    canManageRoles,
    can,
    activeWorkspace,
    removeMember,
  } = useStore();

  useEffect(() => { void refreshTeamData(); }, [refreshTeamData]);

  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<"directory" | "approvals" | "invites" | "roles">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [hasCopied, setHasCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);



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

  if (activeTab === "roles") return <div className="h-full overflow-y-auto space-y-5 pb-8"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Roles & access</h2><button onClick={() => setActiveTab("directory")} className="rounded-lg border border-border px-3 py-2 text-xs">Back to members</button></div><RoleManagement /></div>;

  return (
    <div className="flex flex-col h-full space-y-4">
      {canManageRoles && <button onClick={() => setActiveTab("roles")} className="self-end rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">Manage roles & access</button>}
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

        {canManageRoles && <button
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
        </button>}

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
              {filteredMembers.length === 0 && <EmptyState className="col-span-full self-start" icon={Users} title={searchQuery ? "No teammates match your search" : "Build your team here"} description={searchQuery ? "Try a different name, email, or role to find your teammate." : "Your team directory will fill up as people join the workspace."} actionLabel={searchQuery ? "Clear search" : undefined} onAction={searchQuery ? () => setSearchQuery("") : undefined} />}
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
                        <UserAvatar user={member} size="lg" showStatus />

                        {/* Role Selector or Badge */}
                        <div className="flex items-center space-x-1.5">
                          {canManageRoles && member.id !== currentUser.id && member.id !== activeWorkspace.owner_id ? (
                            <select
                              value={member.id === activeWorkspace.owner_id ? "owner" : roleAssignments[member.id] || defaultRoleKey(member.role)}
                              onChange={(e) =>
                                void assignWorkspaceRole(member.id, e.target.value).then((ok) => ok ? toast.success("Role updated") : toast.error("Could not update role", "Check your role access and Supabase setup."))
                              }
                              className="bg-secondary/70 text-[11px] font-semibold rounded-xl px-2.5 py-1 text-foreground border border-border focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer hover:bg-secondary"
                            >
                              {workspaceRoles.filter((role) => role.key !== "owner").map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-primary/10 text-primary capitalize border border-primary/20">
                              {workspaceRoles.find((role) => role.key === (member.id === activeWorkspace.owner_id ? "owner" : roleAssignments[member.id] || defaultRoleKey(member.role)))?.name || member.role}
                            </span>
                          )}

                          {canManageRoles && member.id !== currentUser.id && member.id !== activeWorkspace.owner_id && (
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
      {activeTab === "approvals" && canManageRoles && (
        <div className="space-y-4 flex-1">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start space-x-3">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Administrator Review Queue</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                When new teammates register using an invitation link, their accounts remain in this queue. Once approved by an Admin or Owner, their invited role becomes active and they gain workspace access. This applies to every role, including Admin.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <EmptyState icon={UserCheck} title="You're all caught up" description="There are no registrations waiting for approval. New requests will appear here when teammates sign up." />
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
                        <UserAvatar user={applicant} size="lg" />
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
                            <span>Awaiting approval · {applicant.role.replace(/_/g, " ")}</span>
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
                        <span>Approve {applicant.role.replace(/_/g, " ")}</span>
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
            <EmptyState icon={LinkIcon} title="Bring your team together" description="Create an invitation link when you're ready to welcome a new teammate." actionLabel={canManageRoles ? "Create invitation link" : undefined} onAction={canManageRoles ? () => { setGeneratedLink(""); setInviteEmail(""); setIsInviteModalOpen(true); } : undefined} />
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
      <AnimatePresence>
        {isInviteModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={() => setIsInviteModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-md max-h-[85vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-secondary/30 shrink-0">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Invite Teammate</h3>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
                {!generatedLink ? (
                  <form onSubmit={handleGenerateInvite} className="space-y-3.5 text-xs">
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
                    <label className="font-semibold text-foreground">Assigned Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as Role)}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
                    >
                      <option value="member">👤 Member — Standard task & project contributor</option>
                      <option value="project_manager">📁 Project Manager — Create and manage projects</option>
                      <option value="admin">🛡️ Admin — Full workspace administrative control</option>
                      <option value="guest">👁️ Guest — Read-only observation</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">How onboarding works:</p>
                    <p>
                      1. Invitee opens your link and sets their <strong>Full Name</strong>, <strong>@username</strong>, and <strong>Password</strong>.
                    </p>
                    <p>
                      2. Their profile appears in your <strong>Pending Approvals</strong> tab.
                    </p>
                    <p>
                      3. An Admin or Owner clicks <strong>Approve</strong> to activate their account!
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
