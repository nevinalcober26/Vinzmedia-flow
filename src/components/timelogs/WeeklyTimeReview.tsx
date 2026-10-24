"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import { formatDuration } from "@/lib/utils";

export function WeeklyTimeReview({ week, selectedProject, onReview }: { week: string; selectedProject: string; onReview: (id: string) => void }) {
  const { timeEntries, projects, currentUser, activeWorkspaceId, notifications, markNotificationRead } = useStore();
  const toast = useToast();
  const [finalized, setFinalized] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const summaries = useMemo(() => {
    const end = new Date(`${week}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 7);
    const until = end.toISOString().slice(0, 10);
    return projects.map((project) => {
      const entries = timeEntries.filter((entry) => {
        const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(entry.started_at));
        return entry.user_id === currentUser.id && entry.project_id === project.id && day >= week && day < until;
      });
      return { project, count: entries.length, seconds: entries.reduce((sum, entry) => sum + entry.duration_seconds, 0) };
    }).filter((item) => item.count > 0);
  }, [projects, timeEntries, currentUser.id, week]);
  const entriesVersion = timeEntries.map((entry) => `${entry.id}:${entry.project_id}:${entry.duration_seconds}:${entry.started_at}:${entry.work_summary}`).join("|");
  useEffect(() => {
    let cancelled = false;
    setFinalized([]); setLoadError(false);
    if (supabase) void supabase.from("weekly_time_reviews").select("project_id").eq("workspace_id", activeWorkspaceId).eq("user_id", currentUser.id).eq("week_start", week).then(({ data, error }) => {
      if (cancelled) return;
      setLoadError(Boolean(error)); setFinalized((data || []).map((row) => row.project_id));
    });
    return () => { cancelled = true; };
  }, [activeWorkspaceId, currentUser.id, week, entriesVersion]);
  const finalize = async (projectId: string) => {
    if (!supabase) return;
    setBusy(projectId);
    try {
      const { error } = await supabase.rpc("finalize_weekly_time_review", { target_project: projectId, target_week: week });
      if (error) { toast.error("Summary not finalized", error.message); return; }
      setFinalized((previous) => [...previous, projectId]);
      notifications.filter((item) => item.link_url === `/timelogs?project=${projectId}&week=${week}`).forEach((item) => markNotificationRead(item.id));
      toast.success("Weekly summary finalized", "Saved for this project. Any later time changes will reopen the review.");
    } catch { toast.error("Summary not finalized", "Check your connection and retry."); } finally { setBusy(null); }
  };
  if (!summaries.length) return null;
  return <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
    <h3 className="text-sm font-semibold">Weekly summary review</h3>
    <p className="mt-1 text-xs text-muted-foreground">Review your tasks, summaries and time for each project before finalizing. Weeks follow Dubai time.</p>
    {loadError && <p className="mt-2 text-xs text-amber-600">Weekly review setup is pending. Run the workspace collaboration SQL to enable finalization.</p>}
    <div className="mt-3 grid gap-2 lg:grid-cols-2">{summaries.map(({ project, count, seconds }) => <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div><p className="text-xs font-semibold">{project.name}</p><p className="mt-1 text-xs text-muted-foreground">{count} entries · {formatDuration(seconds)}</p></div>
      {finalized.includes(project.id) ? <span className="text-xs font-medium text-emerald-600">Finalized ✓</span> : <div className="flex gap-2"><button onClick={() => onReview(project.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Review entries</button><button disabled={busy !== null || loadError || selectedProject !== project.id} onClick={() => void finalize(project.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40">{busy === project.id ? "Saving…" : "Finalize"}</button></div>}
    </div>)}</div>
  </section>;
}
