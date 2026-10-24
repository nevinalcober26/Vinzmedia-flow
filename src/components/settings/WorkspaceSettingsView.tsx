"use client";

import React, { useEffect, useRef, useState } from "react";
import { getInvoiceSenderSettings, saveInvoiceSenderSettings } from "@/lib/invoiceSenderSettings";
import { useStore } from "@/context/StoreContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { workspaceService } from "@/lib/services/workspaceService";
import { WorkspaceLogo } from "@/components/common/WorkspaceLogo";
import type { Workspace } from "@/types";
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
  Upload,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { RoleManagement } from "@/components/team/RoleManagement";
import { DatabaseSchemaView } from "./DatabaseSchemaView";

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // keep in sync with the `workspace-logos` bucket limit

export function WorkspaceSettingsView() {
  const confirm = useConfirm();
  const toast = useToast();
  const {
    can,
    activeWorkspace,
    createWorkspace,
    updateWorkspace,
    workspaces,
    currentUser,
    resetAllData,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"general" | "database" | "rbac" | "danger">("general");
  const [wsName, setWsName] = useState(activeWorkspace.name);
  const [wsTagline, setWsTagline] = useState(activeWorkspace.tagline || "");
  const [wsDesc, setWsDesc] = useState(activeWorkspace.description || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(activeWorkspace.logo_url);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [newWsName, setNewWsName] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [invoiceSender, setInvoiceSender] = useState(() => getInvoiceSenderSettings(activeWorkspace.id, activeWorkspace.name));
  const [senderSaved, setSenderSaved] = useState(false);

  useEffect(() => {
    setInvoiceSender(getInvoiceSenderSettings(activeWorkspace.id, activeWorkspace.name));
  }, [activeWorkspace.id, activeWorkspace.name]);

  // Re-sync brand form when switching workspace or when data loads from Supabase
  useEffect(() => {
    setWsName(activeWorkspace.name);
    setWsTagline(activeWorkspace.tagline || "");
    setWsDesc(activeWorkspace.description || "");
    setLogoFile(null);
    setRemoveLogo(false);
    setLogoPreview(activeWorkspace.logo_url);
  }, [activeWorkspace.id, activeWorkspace.name, activeWorkspace.tagline, activeWorkspace.description, activeWorkspace.logo_url]);

  // Release object URLs created for local previews
  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const canEdit = can("workspace:manage");

  const pickLogo = (file?: File | null) => {
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error("Unsupported file", "Use a PNG, JPG, WEBP, SVG or GIF image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo too large", "Logos must be 2 MB or smaller.");
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setLogoFile(null);
    setRemoveLogo(true);
    setLogoPreview(undefined);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const brandDirty =
    wsName.trim() !== activeWorkspace.name ||
    wsTagline.trim() !== (activeWorkspace.tagline || "") ||
    wsDesc.trim() !== (activeWorkspace.description || "") ||
    Boolean(logoFile) ||
    (removeLogo && Boolean(activeWorkspace.logo_url));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || isSavingBrand) return;
    const name = wsName.trim();
    if (!name) {
      toast.error("Name required", "Workspace name cannot be empty.");
      return;
    }

    setIsSavingBrand(true);
    try {
      const patch: Partial<Pick<Workspace, "name" | "tagline" | "description" | "logo_url" | "logo_path">> = {
        name,
        tagline: wsTagline.trim() || undefined,
        description: wsDesc.trim() || undefined,
      };
      const oldLogoPath = activeWorkspace.logo_path;

      if (logoFile) {
        const uploaded = await workspaceService.uploadWorkspaceLogo(activeWorkspace.id, logoFile);
        if ("error" in uploaded) {
          toast.error("Logo upload failed", uploaded.error);
          return;
        }
        patch.logo_url = uploaded.url;
        patch.logo_path = uploaded.path;
      } else if (removeLogo) {
        patch.logo_url = undefined;
        patch.logo_path = undefined;
      }

      const result = await updateWorkspace(activeWorkspace.id, patch);
      if (!result.success) {
        if (patch.logo_path) await workspaceService.removeWorkspaceLogo(patch.logo_path);
        toast.error("Could not save", result.error || "Workspace update failed.");
        return;
      }
      if ((logoFile || removeLogo) && oldLogoPath && oldLogoPath !== patch.logo_path) {
        await workspaceService.removeWorkspaceLogo(oldLogoPath);
      }

      setLogoFile(null);
      setRemoveLogo(false);
      setIsSaved(true);
      toast.success("Settings Saved", "Workspace brand updated successfully.");
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      toast.error("Could not save branding", error instanceof Error ? error.message : "Check your connection and try again.");
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleCreateWs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    if (!(await createWorkspace(newWsName.trim()))) return;
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
          <div className="p-6 rounded-2xl bg-card border border-border shadow-2xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Brand & Organization</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Logo, name and tagline shown at the top of the sidebar for everyone in this workspace.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5 text-xs">
              {/* Live preview — mirrors the sidebar brand card */}
              <div className="space-y-1.5">
                <span className="font-semibold text-foreground">Sidebar preview</span>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-[#0b111a] px-5 py-4 max-w-md">
                  <WorkspaceLogo
                    name={wsName || activeWorkspace.name}
                    logoUrl={logoPreview}
                    className="w-11 h-11"
                    textClassName="text-sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-tight text-white truncate">
                      {wsName.trim() || "Workspace name"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{wsTagline.trim() || "Workspace"}</p>
                  </div>
                </div>
              </div>

              {/* Logo uploader */}
              <div className="space-y-1.5">
                <span className="font-semibold text-foreground">Logo</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => logoInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (canEdit) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (canEdit) pickLogo(e.dataTransfer.files?.[0]);
                    }}
                    className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-secondary/40"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-secondary/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {logoPreview ? (
                        <WorkspaceLogo name={wsName || activeWorkspace.name} logoUrl={logoPreview} className="w-14 h-14" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        {logoPreview ? "Replace logo" : "Upload logo"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Click or drag & drop · PNG, JPG, WEBP, SVG, GIF · max 2 MB · square works best
                      </p>
                    </div>
                  </button>
                  {canEdit && logoPreview && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept={ALLOWED_LOGO_TYPES.join(",")}
                    className="hidden"
                    onChange={(e) => pickLogo(e.target.files?.[0])}
                  />
                </div>
                {!isSupabaseConfigured && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Supabase is not configured — logo uploads require the <code>workspace-logos</code> bucket.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="ws-name" className="font-semibold text-foreground">Workspace Name</label>
                  <input
                    id="ws-name"
                    type="text"
                    maxLength={80}
                    disabled={!canEdit}
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder="VinzMedia"
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ws-tagline" className="font-semibold text-foreground">Tagline</label>
                  <input
                    id="ws-tagline"
                    type="text"
                    maxLength={80}
                    disabled={!canEdit}
                    value={wsTagline}
                    onChange={(e) => setWsTagline(e.target.value)}
                    placeholder="Design & Development"
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="ws-desc" className="font-semibold text-foreground">Description</label>
                <textarea
                  id="ws-desc"
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
                    disabled={isSavingBrand || (!brandDirty && !isSaved)}
                    className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 flex items-center space-x-1.5 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isSavingBrand ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaved ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSavingBrand ? "Saving…" : isSaved ? "Saved!" : "Save Changes"}</span>
                  </button>
                )}
              </div>
            </form>
          </div>

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
