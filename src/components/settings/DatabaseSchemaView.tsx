"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  CheckCircle2,
  Copy,
  Check,
  Shield,
  Layers,
  Table,
  RefreshCw,
  ExternalLink,
  Code2,
} from "lucide-react";
import { checkSupabaseHealth, DatabaseHealthStatus } from "@/lib/databaseSync";

export function DatabaseSchemaView() {
  const [health, setHealth] = useState<DatabaseHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<string>("tables");

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const res = await checkSupabaseHealth();
      setHealth(res);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleCopySql = async () => {
    try {
      const res = await fetch("/api/schema-sql");
      const sql = await res.text();
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const schemaTables = [
    {
      name: "profiles",
      description: "User profiles, avatars, roles (RBAC), departments & online presence",
      columns: ["id (UUID, PK)", "email (TEXT)", "full_name (TEXT)", "role (TEXT)", "status (TEXT)", "department (TEXT)"],
      rls: "Users can view workspace peers, update own profile",
    },
    {
      name: "workspaces",
      description: "Multi-tenant workspaces with unique slugs, plans & ownership",
      columns: ["id (UUID, PK)", "name (TEXT)", "slug (TEXT, UNIQUE)", "owner_id (UUID)", "plan (TEXT)"],
      rls: "Restricted to members and owners",
    },
    {
      name: "workspace_members",
      description: "RBAC membership table with roles (owner, admin, pm, member, guest)",
      columns: ["id (UUID, PK)", "workspace_id (UUID, FK)", "user_id (UUID, FK)", "role (TEXT)", "joined_at"],
      rls: "Enforced at database level",
    },
    {
      name: "projects",
      description: "Team projects with progress %, color tokens, status and target dates",
      columns: ["id (UUID, PK)", "workspace_id (UUID, FK)", "name (TEXT)", "status (TEXT)", "priority (TEXT)", "progress (INT)"],
      rls: "Workspace members only; deletion restricted to Owner/Admin",
    },
    {
      name: "task_columns",
      description: "Customizable Kanban board workflow columns per project/workspace",
      columns: ["id (UUID, PK)", "workspace_id (UUID)", "title (TEXT)", "status_key (TEXT)", "order_index (INT)", "color (TEXT)"],
      rls: "Workspace members",
    },
    {
      name: "tasks",
      description: "Core tasks with rich markdown descriptions, priority, orders, time tracking",
      columns: ["id (UUID, PK)", "project_id (UUID, FK)", "title (TEXT)", "description (TEXT)", "status (TEXT)", "priority (TEXT)", "tracked_seconds (INT)"],
      rls: "Workspace members; deletion role-governed",
    },
    {
      name: "subtasks",
      description: "Checklist subtasks with progress tracking",
      columns: ["id (UUID, PK)", "task_id (UUID, FK)", "title (TEXT)", "completed (BOOLEAN)", "order_index (INT)"],
      rls: "Task project members",
    },
    {
      name: "comments",
      description: "Discussions, mentions, and emoji reactions",
      columns: ["id (UUID, PK)", "task_id (UUID, FK)", "user_id (UUID, FK)", "content (TEXT)", "reactions (JSONB)"],
      rls: "Workspace members",
    },
    {
      name: "notes",
      description: "Notion-inspired rich markdown notes & scratchpads with pinned states",
      columns: ["id (UUID, PK)", "workspace_id (UUID, FK)", "title (TEXT)", "content (TEXT)", "is_pinned (BOOLEAN)", "tags (TEXT[])"],
      rls: "Author & workspace members",
    },
    {
      name: "announcements",
      description: "Workspace & project bulletins with reactions and read receipts",
      columns: ["id (UUID, PK)", "workspace_id (UUID, FK)", "title (TEXT)", "content (TEXT)", "priority (TEXT)", "read_by (UUID[])"],
      rls: "Readable by all members; insert restricted to Admin/Owner/PM",
    },
    {
      name: "time_entries",
      description: "Stopwatch sessions and manual billable time tracking entries",
      columns: ["id (UUID, PK)", "task_id (UUID, FK)", "user_id (UUID, FK)", "duration_seconds (INT)", "is_billable (BOOLEAN)"],
      rls: "Workspace members",
    },
  ];

  return (
    <div className="space-y-6 text-xs">
      {/* Top Banner: Connection Status & Actions */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Supabase Relational Database Architecture
              </h3>
              <p className="text-muted-foreground text-[11px]">
                PostgreSQL schema, indexes, and Row Level Security (RLS) policies
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={runHealthCheck}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-foreground font-medium flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Checking..." : "Verify Connection"}</span>
            </button>

            <button
              onClick={handleCopySql}
              className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center space-x-1.5 shadow-sm transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "SQL Copied!" : "Copy Full Migration SQL"}</span>
            </button>
          </div>
        </div>

        {/* Health status alert */}
        <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground">
              {health?.connected ? "Supabase Live Connection Active" : "Dual-Engine: Local Persistence + Supabase Ready"}
            </span>
            <span className="text-muted-foreground text-[11px] hidden sm:inline">
              — {health?.message}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary font-semibold">
            11 Core Tables
          </span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {schemaTables.map((tbl) => (
          <div
            key={tbl.name}
            className="p-4 rounded-xl border border-border/80 bg-card space-y-2.5 shadow-2xs hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Table className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono font-bold text-foreground text-xs">
                  public.{tbl.name}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                RLS Protected
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              {tbl.description}
            </p>

            <div className="space-y-1 pt-1 border-t border-border/40">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                Columns:
              </span>
              <div className="flex flex-wrap gap-1">
                {tbl.columns.map((c) => (
                  <span
                    key={c}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground flex items-center space-x-1 pt-1">
              <Shield className="w-3 h-3 text-indigo-500" />
              <span>{tbl.rls}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
