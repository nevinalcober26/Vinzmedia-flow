import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Note } from "@/types";

export const noteService = {
  async getNotes(workspaceId: string): Promise<Note[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes from Supabase:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        project_id: row.project_id || undefined,
        author_id: row.author_id,
        title: row.title,
        content: row.content,
        is_pinned: row.is_pinned || false,
        is_private: row.is_private || false,
        tags: row.tags || [],
        color: row.color || "yellow",
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error("noteService.getNotes exception:", err);
      return [];
    }
  },

  async createNote(note: Partial<Note>): Promise<Note | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const payload = {
        id: note.id,
        workspace_id: note.workspace_id,
        project_id: note.project_id || null,
        author_id: note.author_id,
        title: note.title,
        content: note.content || "",
        is_pinned: note.is_pinned || false,
        is_private: note.is_private || false,
        tags: note.tags || [],
        color: note.color || "yellow",
      };

      const { data, error } = await supabase.from("notes").insert(payload).select().single();
      if (error) {
        console.error("Error creating note in Supabase:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("noteService.createNote exception:", err);
      return null;
    }
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload: Record<string, any> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.is_pinned !== undefined) payload.is_pinned = updates.is_pinned;
      if (updates.project_id !== undefined) payload.project_id = updates.project_id || null;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.color !== undefined) payload.color = updates.color;

      const { data, error } = await supabase.from("notes").update(payload).eq("id", id).select("id").maybeSingle();
      return !error && Boolean(data);
    } catch {
      return false;
    }
  },

  async deleteNote(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      return !error;
    } catch {
      return false;
    }
  },
};
