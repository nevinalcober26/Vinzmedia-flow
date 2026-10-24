import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { TimeEntry } from "@/types";
import { format } from "date-fns";

export const timeEntryService = {
  async getTimeEntries(workspaceId: string): Promise<TimeEntry[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
      .from("time_entries")
      .select("id, workspace_id, project_id, task_id, user_id, description, work_summary, duration_seconds, started_at, ended_at, is_billable")
      .eq("workspace_id", workspaceId)
      .order("started_at", { ascending: false })
      .limit(500);
      if (error) {
        console.warn("Could not load time entries:", error.message);
        return null;
      }
      return (data || []).map((row) => ({
      id: row.id,
      workspace_id: row.workspace_id,
      project_id: row.project_id || undefined,
      task_id: row.task_id || undefined,
      user_id: row.user_id,
      description: row.description || row.work_summary || "",
      work_summary: row.work_summary || row.description || "",
      duration_seconds: row.duration_seconds || 0,
      started_at: row.started_at,
      ended_at: row.ended_at || undefined,
      is_billable: row.is_billable ?? true,
      }));
    } catch (error) {
      console.warn("Could not load time entries:", error);
      return null;
    }
  },

  async createTimeEntry(entry: TimeEntry): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("time_entries").insert({
      id: entry.id,
      workspace_id: entry.workspace_id,
      project_id: entry.project_id,
      task_id: entry.task_id || null,
      user_id: entry.user_id,
      description: entry.description,
      work_summary: entry.work_summary || entry.description,
      duration_seconds: entry.duration_seconds,
      started_at: entry.started_at,
      entry_date: format(new Date(entry.started_at), "yyyy-MM-dd"),
      ended_at: entry.ended_at || null,
      is_billable: entry.is_billable,
      });
      if (error) {
        console.warn("Could not save time entry:", error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.warn("Could not save time entry:", error);
      return false;
    }
  },

  async updateTimeEntry(entry: TimeEntry): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { data, error } = await supabase.from("time_entries").update({
      project_id: entry.project_id,
      task_id: entry.task_id,
      description: entry.description,
      work_summary: entry.work_summary,
      duration_seconds: entry.duration_seconds,
      started_at: entry.started_at,
      entry_date: format(new Date(entry.started_at), "yyyy-MM-dd"),
      ended_at: entry.ended_at || null,
      is_billable: entry.is_billable,
    }).eq("id", entry.id).eq("user_id", entry.user_id).select("id").maybeSingle();
      if (error) console.warn("Could not update time entry:", error.message);
      return !error && Boolean(data);
    } catch (error) {
      console.warn("Could not update time entry:", error);
      return false;
    }
  },

  async deleteTimeEntry(entry: TimeEntry): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { data, error } = await supabase.from("time_entries").delete().eq("id", entry.id).eq("user_id", entry.user_id).select("id").maybeSingle();
      if (error) console.warn("Could not delete time entry:", error.message);
      return !error && Boolean(data);
    } catch (error) {
      console.warn("Could not delete time entry:", error);
      return false;
    }
  },
};
