"use client";

import React, { useEffect, useState } from "react";
import { getInvoiceSenderSettings, saveInvoiceSenderSettings } from "@/lib/invoiceSenderSettings";
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
import { RoleManagement } from "@/components/team/RoleManagement";
import { DatabaseSchemaView } from "./DatabaseSchemaView";

export function WorkspaceSettingsView() {
  const confirm = useConfirm();
  const toast = useToast();
  const {
    can,
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
  const [invoiceSender, setInvoiceSender] = useState(() => getInvoiceSenderSettings(activeWorkspace.id, activeWorkspace.name));
  const [senderSaved, setSenderSaved] = useState(false);

  useEffect(() => {
    setInvoiceSender(getInvoiceSenderSettings(activeWorkspace.id, activeWorkspace.name));
  }, [activeWorkspace.id, activeWorkspace.name]);

  const canEdit = can("workspace:manage");

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
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-foreground">Invoice sender</h3>
            <p className="mt-1 text-xs text-muted-foreground">These details appear in the From section of invoice previews and PDFs.</p>
            <form className="mt-5 grid gap-4 text-xs sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault();
              saveInvoiceSenderSettings(activeWorkspace.id, invoiceSender);
              setSenderSaved(true);
              toast.success("Invoice sender saved", "Future invoice previews will use these details.");
              setTimeout(() => setSenderSaved(false), 2000);
            }}>
              {([
                ["company", "Company name"], ["email", "Billing email"],
                ["address", "Address"], ["taxId", "Tax ID"], ["logoUrl", "Invoice logo URL (optional)"],
              ] as const).map(([field, label]) => (
                <label key={field} className="space-y-1.5 font-semibold text-foreground">
                  <span>{label}</span>
                  <input type={field === "email" ? "email" : "text"} disabled={!canEdit} value={invoiceSender[field]}
                    onChange={(event) => setInvoiceSender((current) => ({ ...current, [field]: event.target.value }))}
                    className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 font-normal text-foreground disabled:opacity-60" />
                </label>
              ))}
              {canEdit && <div className="sm:col-span-2 flex justify-end"><button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-xs hover:bg-primary/90">{senderSaved ? "Saved" : "Save invoice sender"}</button></div>}
            </form>
          </div>
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

      {activeTab === "rbac" && <RoleManagement />}

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
