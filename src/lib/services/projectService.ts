import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Project } from "@/types";

export const projectService = {
  async getProjects(workspaceId: string): Promise<Project[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects from Supabase:", error);
        return [];
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        name: row.name,
        description: row.description || "",
        icon: row.icon || "FolderKanban",
        color: row.color || "#3b82f6",
        status: row.status,
        priority: row.priority,
        owner_id: row.owner_id,
        start_date: row.start_date || "",
        target_date: row.target_date || "",
        progress: row.progress || 0,
        member_ids: [row.owner_id],
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.error("projectService.getProjects exception:", err);
      return [];
    }
  },

  async createProject(project: Partial<Project>): Promise<Project | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const payload = {
        id: project.id,
        workspace_id: project.workspace_id,
        name: project.name,
        description: project.description || "",
        icon: project.icon || "FolderKanban",
        color: project.color || "#3b82f6",
        status: project.status || "active",
        priority: project.priority || "medium",
        owner_id: project.owner_id,
        start_date: project.start_date || null,
        target_date: project.target_date || null,
        progress: project.progress || 0,
      };

      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Error creating project in Supabase:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("projectService.createProject exception:", err);
      return null;
    }
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.icon !== undefined) payload.icon = updates.icon;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.start_date !== undefined) payload.start_date = updates.start_date || null;
      if (updates.target_date !== undefined) payload.target_date = updates.target_date || null;
      if (updates.progress !== undefined) payload.progress = updates.progress;

      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", id);

      if (error) {
        console.error("Error updating project in Supabase:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("projectService.updateProject exception:", err);
      return false;
    }
  },

  async deleteProject(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        console.error("Error deleting project from Supabase:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("projectService.deleteProject exception:", err);
      return false;
    }
  },
};
