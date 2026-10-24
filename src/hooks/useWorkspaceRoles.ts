"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActiveView, Role } from "@/types";
import { Permission } from "@/lib/permissions";
import defaults from "@/lib/roleDefaults.json";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface WorkspaceRole {
  key: string;
  name: string;
  base_role: Role;
  sidebar: string[];
  permissions: Permission[];
}

export const SIDEBAR_ACCESS = [
  ["dashboard", "Dashboard"], ["my_tasks", "My Tasks"], ["projects", "Projects"],
  ["calendar", "Calendar"], ["timelogs", "Time Tracking"], ["billing", "Billing & Invoices"],
  ["clients", "Clients & Files"], ["team", "Team & Roles"], ["announcements", "Announcements"],
  ["notes", "Notes & Docs"], ["workload", "Team Workload"], ["activity", "Activity Log"], ["settings", "Settings"],
] as const;
export const ACTION_ACCESS = defaults[0].permissions as Permission[];
export const defaultRoleKey = (role: Role) => role === "admin" ? "super_admin" : role;

export function useWorkspaceRoles(workspaceId: string, userId: string, baseRole: Role, ownerId: string) {
  const [roles, setRoles] = useState<WorkspaceRole[]>(defaults as WorkspaceRole[]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loadedWorkspace, setLoadedWorkspace] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadedWorkspace("");
    setRoles(defaults as WorkspaceRole[]);
    setAssignments({});
    const load = async () => {
      if (isSupabaseConfigured && supabase) {
        const [roleResult, assignmentResult] = await Promise.all([
          supabase.from("workspace_roles").select("role_key,name,base_role,sidebar,permissions").eq("workspace_id", workspaceId),
          supabase.from("workspace_role_assignments").select("user_id,role_key").eq("workspace_id", workspaceId),
        ]);
        if (cancelled) return;
        if (!roleResult.error && roleResult.data?.length) setRoles(roleResult.data.map((row) => ({ ...row, key: row.role_key })) as WorkspaceRole[]);
        if (!assignmentResult.error) setAssignments(Object.fromEntries((assignmentResult.data || []).map((row) => [row.user_id, row.role_key])));
      } else {
        try {
          const cached = JSON.parse(localStorage.getItem(`vinzflow_roles_${workspaceId}`) || "null");
          if (cached) { setRoles(cached.roles); setAssignments(cached.assignments); }
        } catch { /* Use built-in role defaults when no valid local settings exist. */ }
      }
      if (!cancelled) setLoadedWorkspace(workspaceId);
    };
    void load().catch(() => { if (!cancelled) setLoadedWorkspace(workspaceId); });
    const refresh = () => { void load().catch(() => undefined); };
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; window.removeEventListener("focus", refresh); };
  }, [workspaceId, userId]);

  const roleKey = userId === ownerId ? "owner" : assignments[userId] || (isSupabaseConfigured ? "guest" : defaultRoleKey(baseRole === "owner" ? "member" : baseRole));
  const currentRole = roles.find((role) => role.key === roleKey) || roles.find((role) => role.key === "guest")!;
  const canManageRoles = loadedWorkspace === workspaceId && (userId === ownerId || roleKey === "super_admin");
  const can = useCallback((permission: Permission) => loadedWorkspace === workspaceId && (userId === ownerId || currentRole.permissions.includes(permission)), [userId, ownerId, currentRole, loadedWorkspace, workspaceId]);
  const canAccessView = useCallback((view: ActiveView) => loadedWorkspace === workspaceId && (userId === ownerId || currentRole.sidebar.includes(view === "project_detail" ? "projects" : view)), [userId, ownerId, currentRole, loadedWorkspace, workspaceId]);

  const saveWorkspaceRole = useCallback(async (role: WorkspaceRole) => {
    if (!canManageRoles || role.key === "owner" || !role.name.trim()) return false;
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from("workspace_roles").upsert({ workspace_id: workspaceId, role_key: role.key, name: role.name.trim(), base_role: role.base_role, sidebar: role.sidebar, permissions: role.permissions }, { onConflict: "workspace_id,role_key" });
      if (error) return false;
    }
    setRoles((previous) => [...previous.filter((item) => item.key !== role.key), role]);
    return true;
  }, [canManageRoles, workspaceId]);

  const assignWorkspaceRole = useCallback(async (targetUserId: string, key: string) => {
    if (!canManageRoles || targetUserId === ownerId || targetUserId === userId || key === "owner" || !roles.some((role) => role.key === key)) return false;
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from("workspace_role_assignments").upsert({ workspace_id: workspaceId, user_id: targetUserId, role_key: key }, { onConflict: "workspace_id,user_id" });
      if (error) return false;
    }
    setAssignments((previous) => ({ ...previous, [targetUserId]: key }));
    return true;
  }, [canManageRoles, ownerId, userId, roles, workspaceId]);

  useEffect(() => {
    if (!isSupabaseConfigured && loadedWorkspace === workspaceId) localStorage.setItem(`vinzflow_roles_${workspaceId}`, JSON.stringify({ roles, assignments }));
  }, [roles, assignments, workspaceId, loadedWorkspace]);

  return useMemo(() => ({ workspaceRoles: roles, roleAssignments: assignments, currentRole, canManageRoles, can, canAccessView, saveWorkspaceRole, assignWorkspaceRole }), [roles, assignments, currentRole, canManageRoles, can, canAccessView, saveWorkspaceRole, assignWorkspaceRole]);
}
