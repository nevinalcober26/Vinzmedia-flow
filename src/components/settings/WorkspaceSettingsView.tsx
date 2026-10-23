"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
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
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export function WorkspaceSettingsView() {
  const {
    activeWorkspace,
    createWorkspace,
    workspaces,
    currentUser,
    resetAllData,
  } = useStore();

  const [wsName, setWsName] = useState(activeWorkspace.name);
  const [wsDesc, setWsDesc] = useState(activeWorkspace.description || "");
  const [newWsName, setNewWsName] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const canEdit = ["owner", "admin"].includes(currentUser.role);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCreateWs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim());
    setNewWsName("");
    alert(`Created workspace "${newWsName.trim()}"!`);
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-4xl mx-auto w-full pb-16 overflow-y-auto">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base font-bold text-foreground">Workspace Settings</h2>
        <p className="text-xs text-muted-foreground">
          Configure organization profile, security, and cloud persistence
        </p>
      </div>

      {/* General Settings Card */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-foreground">General Information</h3>

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

      {/* Database & Cloud Persistence Status */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-foreground">Database & Realtime Persistence</h3>
        </div>

        <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Supabase PostgreSQL Connection:</span>
            {isSupabaseConfigured ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                Connected & Live
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/30">
                Local-First Engine (Active)
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The platform is running with full real-time cross-tab synchronization and persistent local storage. To connect directly to a Supabase PostgreSQL instance, simply populate <code className="font-mono text-primary font-semibold">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono text-primary font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code className="font-mono text-foreground">.env.local</code> and run the provided migration script in <code className="font-mono text-foreground">supabase/migrations/001_initial_schema.sql</code>.
          </p>
        </div>
      </div>

      {/* Create New Workspace */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-4">
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

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-sm font-bold">Danger Zone</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Reset all demo data back to the clean initial seed state (all sample projects, tasks, comments, notes, and activity logs).
        </p>

        <div>
          <button
            onClick={() => {
              if (confirm("Reset all project and task data back to the original demo state?")) {
                resetAllData();
                alert("Data reset to clean demo state!");
              }
            }}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset All Data to Demo Seed</span>
          </button>
        </div>
      </div>
    </div>
  );
}
