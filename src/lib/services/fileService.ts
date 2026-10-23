import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ProjectFile } from "@/types";

export const fileService = {
  async getFiles(workspaceId: string): Promise<ProjectFile[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching files from Supabase:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id || workspaceId,
        name: row.name,
        size: Number(row.size) || 0,
        type: row.type || "application/octet-stream",
        url: row.url,
        project_id: row.project_id || undefined,
        client_id: row.client_id || undefined,
        task_id: row.task_id || undefined,
        uploaded_by: row.uploaded_by || "",
        uploaded_at: row.created_at || new Date().toISOString(),
      }));
    } catch (err) {
      console.error("fileService.getFiles exception:", err);
      return [];
    }
  },

  async uploadFile(fileData: {
    id?: string;
    workspace_id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    project_id?: string;
    client_id?: string;
    uploaded_by?: string;
  }): Promise<ProjectFile | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const payload = {
        id: fileData.id,
        workspace_id: fileData.workspace_id,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
        url: fileData.url,
        project_id: fileData.project_id || null,
        client_id: fileData.client_id || null,
        uploaded_by: fileData.uploaded_by || null,
      };

      const { data, error } = await supabase.from("files").insert(payload).select().single();
      if (error) {
        console.error("Error inserting file record to Supabase:", error);
        return null;
      }
      return {
        id: data.id,
        workspace_id: data.workspace_id,
        name: data.name,
        size: Number(data.size),
        type: data.type,
        url: data.url,
        project_id: data.project_id || undefined,
        client_id: data.client_id || undefined,
        uploaded_by: data.uploaded_by || "",
        uploaded_at: data.created_at || new Date().toISOString(),
      };
    } catch (err) {
      console.error("fileService.uploadFile exception:", err);
      return null;
    }
  },

  async deleteFile(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("files").delete().eq("id", id);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Upload binary file directly to a Supabase Storage Bucket
   * (e.g. 'documents', 'attachments', 'avatars', 'project-logos')
   */
  async uploadToStorage(
    bucket: "attachments" | "project-logos" | "avatars" | "documents",
    filePath: string,
    file: File | Blob
  ): Promise<string | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const cleanPath = `${Date.now()}_${filePath.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
        upsert: true,
      });
      if (error) {
        console.warn(`Storage bucket '${bucket}' upload note:`, error.message);
        return null;
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch (err) {
      console.warn(`Storage bucket '${bucket}' upload exception:`, err);
      return null;
    }
  },
};
