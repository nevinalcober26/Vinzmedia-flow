import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Client } from "@/types";

export const clientService = {
  async getClients(workspaceId: string): Promise<Client[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      let { data: clientsData, error } = await supabase
        .from("clients")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clients from Supabase:", error);
      }

      if (!clientsData || clientsData.length === 0) {
        const { data: allClients } = await supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false });
        if (allClients && allClients.length > 0) {
          clientsData = allClients;
        }
      }

      // Fetch client projects
      const { data: cpData } = await supabase.from("client_projects").select("client_id, project_id");
      const projectsByClient: Record<string, string[]> = {};
      (cpData || []).forEach((row) => {
        if (!projectsByClient[row.client_id]) projectsByClient[row.client_id] = [];
        projectsByClient[row.client_id].push(row.project_id);
      });

      return (clientsData || []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        name: row.name,
        company: row.company,
        email: row.email,
        status: row.status,
        project_ids: projectsByClient[row.id] || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error("clientService.getClients exception:", err);
      return [];
    }
  },

  async createClient(client: Partial<Client>): Promise<Client | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const payload = {
        id: client.id,
        workspace_id: client.workspace_id,
        name: client.name,
        company: client.company,
        email: client.email,
        status: client.status || "active",
      };

      const { data, error } = await supabase.from("clients").insert(payload).select().single();
      if (error) {
        console.error("Error creating client in Supabase:", error);
        return null;
      }

      if (client.project_ids && client.project_ids.length > 0) {
        const rows = client.project_ids.map((pid) => ({
          client_id: data.id,
          project_id: pid,
        }));
        await supabase.from("client_projects").insert(rows);
      }

      return {
        ...data,
        project_ids: client.project_ids || [],
      };
    } catch (err) {
      console.error("clientService.createClient exception:", err);
      return null;
    }
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.company !== undefined) payload.company = updates.company;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.status !== undefined) payload.status = updates.status;

      const { error } = await supabase.from("clients").update(payload).eq("id", id);
      if (error) return false;

      if (updates.project_ids !== undefined) {
        await supabase.from("client_projects").delete().eq("client_id", id);
        if (updates.project_ids.length > 0) {
          const rows = updates.project_ids.map((pid) => ({
            client_id: id,
            project_id: pid,
          }));
          await supabase.from("client_projects").insert(rows);
        }
      }
      return true;
    } catch {
      return false;
    }
  },

  async deleteClient(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      return !error;
    } catch {
      return false;
    }
  },
};
