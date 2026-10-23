import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Workspace, User, Announcement, ActivityLog } from "@/types";

export const workspaceService = {
  async getWorkspaces(): Promise<Workspace[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase.from("workspaces").select("*").order("created_at", { ascending: true });
      if (error) {
        console.error("Error fetching workspaces from Supabase:", error);
        return [];
      }
      return (data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        logo_url: w.logo_url || undefined,
        description: w.description || undefined,
        owner_id: w.owner_id,
        plan: w.plan || "pro",
        created_at: w.created_at,
      }));
    } catch {
      return [];
    }
  },

  async getUsers(): Promise<User[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
      if (error) {
        console.error("Error fetching profiles from Supabase:", error);
        return [];
      }
      return (data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        avatar_url: u.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        role: u.role || "member",
        title: u.title || "Team Member",
        department: u.department || "General",
        status: u.status || "online",
        created_at: u.created_at,
      }));
    } catch {
      return [];
    }
  },

  async getAnnouncements(workspaceId: string): Promise<Announcement[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        project_id: row.project_id || undefined,
        author_id: row.author_id,
        title: row.title,
        content: row.content,
        priority: row.priority || "general",
        is_pinned: row.is_pinned || false,
        read_by: row.read_by || [],
        reactions: row.reactions || [],
        created_at: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async createAnnouncement(ann: Partial<Announcement>): Promise<Announcement | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const payload = {
        id: ann.id,
        workspace_id: ann.workspace_id,
        project_id: ann.project_id || null,
        author_id: ann.author_id,
        title: ann.title,
        content: ann.content,
        priority: ann.priority || "general",
        is_pinned: ann.is_pinned || false,
        read_by: [],
        reactions: [],
      };
      const { data, error } = await supabase.from("announcements").insert(payload).select().single();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  async getActivityLogs(workspaceId: string): Promise<ActivityLog[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*, profiles(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return [];
      return (data || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        project_id: row.project_id || undefined,
        task_id: row.task_id || undefined,
        user_id: row.user_id,
        user: row.profiles || {
          id: row.user_id,
          full_name: "Team Member",
          email: "",
          role: "member",
          status: "online",
          created_at: row.created_at,
        },
        action: row.action,
        details: row.details,
        created_at: row.created_at,
      }));
    } catch {
      return [];
    }
  },
};
