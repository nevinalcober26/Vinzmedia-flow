import { supabase, isSupabaseConfigured } from "./supabase";
import { Project, Task, Note, Announcement, User } from "@/types";

export interface DatabaseHealthStatus {
  isConfigured: boolean;
  connected: boolean;
  tables: Record<string, boolean>;
  message: string;
}

export async function checkSupabaseHealth(): Promise<DatabaseHealthStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      connected: false,
      tables: {},
      message: "Supabase credentials not configured. Running in local-first persistent mode.",
    };
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return {
      isConfigured: true,
      connected: false,
      tables: {},
      message: "Supabase is configured. Sign in again to restore authenticated database access.",
    };
  }

  const tableNames = [
    "profiles",
    "workspaces",
    "projects",
    "tasks",
    "subtasks",
    "comments",
    "notes",
    "announcements",
    "notifications",
    "activity_logs",
    "time_entries",
  ];

  const tableStatus: Record<string, boolean> = {};
  let anyConnected = false;

  for (const tableName of tableNames) {
    try {
      const { error } = await supabase.from(tableName).select("id").limit(1);
      if (!error) {
        tableStatus[tableName] = true;
        anyConnected = true;
      } else {
        tableStatus[tableName] = false;
      }
    } catch {
      tableStatus[tableName] = false;
    }
  }

  return {
    isConfigured: true,
    connected: anyConnected,
    tables: tableStatus,
    message: anyConnected
      ? "Successfully connected to Supabase database tables."
      : "Database requests failed. Check workspace membership, access policies, and connection errors before running migrations.",
  };
}

// Optimistic Supabase Sync Helpers
export async function syncTaskToSupabase(task: Task): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("tasks").upsert({
      id: task.id,
      workspace_id: task.workspace_id,
      project_id: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      order_index: task.order_index,
      creator_id: task.creator_id,
      start_date: task.start_date || null,
      due_date: task.due_date || null,
      labels: task.labels,
      estimated_hours: task.estimated_hours || 0,
      tracked_seconds: task.tracked_seconds || 0,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn("Supabase task sync deferred:", err);
    return false;
  }
}

export async function syncProjectToSupabase(project: Project): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("projects").upsert({
      id: project.id,
      workspace_id: project.workspace_id,
      name: project.name,
      description: project.description,
      color: project.color,
      status: project.status,
      priority: project.priority,
      owner_id: project.owner_id,
      start_date: project.start_date || null,
      target_date: project.target_date || null,
      progress: project.progress,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn("Supabase project sync deferred:", err);
    return false;
  }
}

export async function syncNoteToSupabase(note: Note): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("notes").upsert({
      id: note.id,
      workspace_id: note.workspace_id,
      project_id: note.project_id || null,
      author_id: note.author_id,
      title: note.title,
      content: note.content,
      is_pinned: note.is_pinned,
      tags: note.tags,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn("Supabase note sync deferred:", err);
    return false;
  }
}

export async function syncAnnouncementToSupabase(ann: Announcement): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from("announcements").upsert({
      id: ann.id,
      workspace_id: ann.workspace_id,
      author_id: ann.author_id,
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      is_pinned: ann.is_pinned,
      created_at: ann.created_at,
    });
    return !error;
  } catch (err) {
    console.warn("Supabase announcement sync deferred:", err);
    return false;
  }
}
