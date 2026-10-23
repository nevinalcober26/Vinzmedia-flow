import { Role } from "@/types";

export type Permission =
  | "workspace:manage"
  | "workspace:delete"
  | "members:invite"
  | "members:manage_roles"
  | "members:remove"
  | "project:create"
  | "project:edit"
  | "project:delete"
  | "project:archive"
  | "task:create"
  | "task:edit"
  | "task:delete"
  | "task:move"
  | "announcement:create"
  | "note:create"
  | "note:edit"
  | "comment:create";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    "workspace:manage",
    "workspace:delete",
    "members:invite",
    "members:manage_roles",
    "members:remove",
    "project:create",
    "project:edit",
    "project:delete",
    "project:archive",
    "task:create",
    "task:edit",
    "task:delete",
    "task:move",
    "announcement:create",
    "note:create",
    "note:edit",
    "comment:create",
  ],
  admin: [
    "workspace:manage",
    "members:invite",
    "members:manage_roles",
    "members:remove",
    "project:create",
    "project:edit",
    "project:delete",
    "project:archive",
    "task:create",
    "task:edit",
    "task:delete",
    "task:move",
    "announcement:create",
    "note:create",
    "note:edit",
    "comment:create",
  ],
  project_manager: [
    "members:invite",
    "project:create",
    "project:edit",
    "project:archive",
    "task:create",
    "task:edit",
    "task:delete",
    "task:move",
    "announcement:create",
    "note:create",
    "note:edit",
    "comment:create",
  ],
  member: [
    "task:create",
    "task:edit",
    "task:move",
    "note:create",
    "note:edit",
    "comment:create",
  ],
  guest: [
    "comment:create",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function getRoleBadge(role: Role): {
  label: string;
  className: string;
  description: string;
} {
  switch (role) {
    case "owner":
      return {
        label: "Owner",
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        description: "Full workspace ownership & administrative authority",
      };
    case "admin":
      return {
        label: "Admin",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        description: "Can manage members, projects, security settings",
      };
    case "project_manager":
      return {
        label: "Project Manager",
        className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        description: "Can create projects, manage tasks, and post announcements",
      };
    case "member":
      return {
        label: "Member",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        description: "Can create, update, and collaborate on tasks & notes",
      };
    case "guest":
      return {
        label: "Guest (Viewer)",
        className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
        description: "Read-only access with commenting privileges",
      };
    default:
      return {
        label: role,
        className: "bg-muted text-muted-foreground border-border",
        description: "Standard account",
      };
  }
}
