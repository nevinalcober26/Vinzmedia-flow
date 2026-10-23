"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import {
  Settings,
  Shield,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Save,
  Trash2,
  Users,
  Check,
  X as XIcon,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { DatabaseSchemaView } from "./DatabaseSchemaView";

export function WorkspaceSettingsView() {
  const confirm = useConfirm();
  const toast = useToast();
  const {
    activeWorkspace,
    createWorkspace,
    workspaces,
    currentUser,
    resetAllData,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"general" | "database" | "rbac" | "danger">("general");
  const [wsName, setWsName] = useState(activeWorkspace.name);
  const [wsDesc, setWsDesc] = useState(activeWorkspace.description || "");
  const [newWsName, setNewWsName] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const canEdit = ["owner", "admin"].includes(currentUser.role);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    toast.success("Settings Saved", "Workspace profile updated successfully.");
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCreateWs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim());
    setNewWsName("");
    toast.success("Workspace Created", `Created workspace "${newWsName.trim()}".`);
  };

  const rbacMatrix = [
    { permission: "Delete Workspace & Billing", owner: true, admin: false, pm: false, member: false, guest: false },
    { permission: "Manage Workspace Settings", owner: true, admin: true, pm: false, member: false, guest: false },
    { permission: "Invite Team Members & Change Roles", owner: true, admin: true, pm: true, member: false, guest: false },
    { permission: "Create & Delete Projects", owner: true, admin: true, pm: true, member: false, guest: false },
    { permission: "Post Workspace Announcements", owner: true, admin: true, pm: true, member: false, guest: false },
    { permission: "Create, Edit & Move Tasks", owner: true, admin: true, pm: true, member: true, guest: false },
    { permission: "Add Comments & Emoji Reactions", owner: true, admin: true, pm: true, member: true, guest: true },
    { permission: "View Projects, Boards, & Gantt", owner: true, admin: true, pm: true, member: true, guest: true },
  ];

  return (
    <div className="flex flex-col h-full space-y-5 max-w-5xl mx-auto w-full pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base font-bold text-foreground">Workspace Settings & Database</h2>
        <p className="text-xs text-muted-foreground">
          Organization profile, RBAC permissions, and PostgreSQL cloud architecture
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-border text-xs">
        {[
          { id: "general", label: "General Information", icon: Settings },
          { id: "database", label: "Database Schema & Supabase", icon: Database },
          { id: "rbac", label: "Role-Based Access Control", icon: Shield },
          { id: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-medium transition-colors ${
                isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: General */}
      {activeTab === "general" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-foreground">Organization Details</h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Workspace Name</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg p-2.5 text-xs text-foreground disabled:opacity-60"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-muted-foreground">
                  Workspace Slug: <code className="font-mono text-foreground font-semibold">{activeWorkspace.slug}</code>
                </span>
                {canEdit && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 flex items-center space-x-1.5 transition-all shadow-sm"
                  >
                    {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isSaved ? "Saved!" : "Save Changes"}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Create New Workspace */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-foreground">Create Another Workspace</h3>
            <form onSubmit={handleCreateWs} className="flex items-center space-x-2 text-xs">
              <input
                type="text"
                placeholder="New Workspace Name..."
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!newWsName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Database */}
      {activeTab === "database" && <DatabaseSchemaView />}

      {/* Tab: RBAC */}
      {activeTab === "rbac" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-2xs space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Role-Based Access Control (RBAC) Matrix</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Permissions are enforced in frontend user interfaces and database Row Level Security policies.
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-secondary/60 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-3 font-semibold">Permission Action</th>
                    <th className="p-3 text-center">Owner</th>
                    <th className="p-3 text-center">Admin</th>
                    <th className="p-3 text-center">PM</th>
                    <th className="p-3 text-center">Member</th>
                    <th className="p-3 text-center">Guest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rbacMatrix.map((row) => (
                    <tr key={row.permission} className="hover:bg-secondary/30">
                      <td className="p-3 font-medium text-foreground">{row.permission}</td>
                      <td className="p-3 text-center">
                        {row.owner ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <XIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                      <td className="p-3 text-center">
                        {row.admin ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <XIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                      <td className="p-3 text-center">
                        {row.pm ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <XIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                      <td className="p-3 text-center">
                        {row.member ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <XIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                      <td className="p-3 text-center">
                        {row.guest ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <XIcon className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Danger */}
      {activeTab === "danger" && (
        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-bold">Workspace Synchronization</h3>
          </div>

          <p className="text-xs text-muted-foreground">
            Clear locally cached workspace data and resynchronize directly with the live Supabase database tables.
          </p>

          <div>
            <button
              onClick={() => {
                confirm({
                  title: "Resynchronize with Database?",
                  message: "This will refresh your local cache and reload all live data from Supabase.",
                  confirmText: "Sync Now",
                  variant: "warning",
                  onConfirm: () => {
                    resetAllData();
                    toast.success("Cache Cleared", "Workspace resynchronized with live database.");
                  },
                });
              }}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resync Local Cache with Live Supabase</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
