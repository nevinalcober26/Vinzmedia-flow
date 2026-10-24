"use client";

import { useState } from "react";
import { Plus, Shield, Save } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { WorkspaceRole, SIDEBAR_ACCESS, ACTION_ACCESS } from "@/hooks/useWorkspaceRoles";

export function RoleManagement() {
  const { workspaceRoles, canManageRoles, saveWorkspaceRole } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<WorkspaceRole | null>(null);
  const [saving, setSaving] = useState(false);
  if (!canManageRoles) return null;
  const locked = draft?.key === "owner";
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const ok = await saveWorkspaceRole(draft);
    setSaving(false);
    if (ok) toast.success("Role saved", "Sidebar access and action permissions are updated.");
    else toast.error("Could not save role", "Run the workspace role SQL and check your access.");
  };
  return <section className="grid gap-5 md:grid-cols-[220px_1fr]">
    <div className="space-y-2">
      <button onClick={() => setDraft({ key: `custom_${crypto.randomUUID().replaceAll("-", "")}`, name: "New role", base_role: "member", sidebar: ["dashboard"], permissions: [] })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 text-xs font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add role</button>
      {workspaceRoles.map((role) => <button key={role.key} onClick={() => setDraft({ ...role, sidebar: [...role.sidebar], permissions: [...role.permissions] })} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold ${draft?.key === role.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}><Shield className="h-4 w-4" />{role.name}</button>)}
    </div>
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      {!draft ? <p className="py-12 text-center text-sm text-muted-foreground">Choose a role to review its access, or add a new role.</p> : <>
        <div className="flex flex-wrap items-end justify-between gap-3"><label className="space-y-1 text-xs font-semibold"><span className="block">Role name</span><input value={draft.name} disabled={locked} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2" /></label><button disabled={locked || saving || !draft.name.trim()} onClick={save} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save role"}</button></div>
        <p className="mt-3 text-xs text-muted-foreground">{locked ? "The workspace owner retains full access." : "Uncheck a page to remove it from navigation and block access to that page. Action permissions control what this role can change."}</p>
        <h3 className="mb-3 mt-6 text-sm font-semibold">Sidebar access</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{SIDEBAR_ACCESS.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs"><input type="checkbox" checked={draft.sidebar.includes(key)} disabled={locked || (draft.key === "super_admin" && ["team", "settings"].includes(key))} onChange={(e) => setDraft({ ...draft, sidebar: e.target.checked ? [...draft.sidebar, key] : draft.sidebar.filter((item) => item !== key) })} />{label}</label>)}</div>
        <h3 className="mb-3 mt-6 text-sm font-semibold">Action permissions</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ACTION_ACCESS.filter((key) => key !== "members:manage_roles").map((key) => <label key={key} className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs capitalize"><input type="checkbox" checked={draft.permissions.includes(key)} disabled={locked} onChange={(e) => setDraft({ ...draft, permissions: e.target.checked ? [...draft.permissions, key] : draft.permissions.filter((item) => item !== key) })} />{key.replace(":", " · ").replaceAll("_", " ")}</label>)}</div>
        <p className="mt-4 text-xs text-muted-foreground">Role management is reserved for the Owner and Super Admin.</p>
      </>}
    </div>
  </section>;
}
