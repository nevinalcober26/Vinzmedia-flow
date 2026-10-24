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
        logo_path: w.logo_path || undefined,
        tagline: w.tagline || undefined,
        description: w.description || undefined,
        owner_id: w.owner_id,
        plan: w.plan || "pro",
        created_at: w.created_at,
      }));
    } catch {
      return [];
    }
  },

  /** Persist workspace branding / profile fields. Returns an error message on failure. */
  async updateWorkspace(
    workspaceId: string,
    patch: Partial<Pick<Workspace, "name" | "tagline" | "description" | "logo_url" | "logo_path">>
  ): Promise<string | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const payload: Record<string, string | null> = {};
    (["name", "tagline", "description", "logo_url", "logo_path"] as const).forEach((key) => {
      if (key in patch) payload[key] = (patch[key] as string | undefined) ?? null;
    });
    const { data, error } = await supabase.from("workspaces").update(payload).eq("id", workspaceId).select("id").maybeSingle();
    if (error) return error.message;
    return data ? null : "Your account cannot update this workspace. Ask the Owner to check your workspace access.";
  },

  /** Upload a logo into the `workspace-logos` bucket under `<workspaceId>/`. */
  async uploadWorkspaceLogo(
    workspaceId: string,
    file: File
  ): Promise<{ url: string; path: string } | { error: string }> {
    if (!isSupabaseConfigured || !supabase) return { error: "Supabase is not configured." };
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Your sign-in has expired. Sign in again before uploading a logo." };
    if (file.size > 2 * 1024 * 1024) return { error: "Choose a logo smaller than 2 MB." };
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"].includes(file.type)) {
      return { error: "Choose a PNG, JPG, WEBP, SVG, or GIF logo." };
    }
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${workspaceId}/${Date.now()}-logo.${ext}`;
    const { data, error } = await supabase.storage
      .from("workspace-logos")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error || !data) {
      const message = error?.message || "Upload failed.";
      if (/row.level security|permission denied|bucket not found/i.test(message)) {
        return { error: "Supabase blocked the logo upload. Run fix_workspace_logo_upload.sql in your project's SQL Editor, then retry. Your role needs Manage Workspace access." };
      }
      return { error: message };
    }
    const { data: urlData } = supabase.storage.from("workspace-logos").getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path };
  },

  /** Best-effort removal of a previous logo object. */
  async removeWorkspaceLogo(path?: string): Promise<void> {
    if (!path || !isSupabaseConfigured || !supabase) return;
    try {
      await supabase.storage.from("workspace-logos").remove([path]);
    } catch {
      /* ignore – old file cleanup is non-critical */
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
