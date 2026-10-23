import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Project } from "@/types";

export const projectService = {
  async getProjects(workspaceId: string): Promise<Project[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      let { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects from Supabase:", error);
      }

      // Resilience: If no projects found with specific workspace_id, check if any projects exist
      if ((!data || data.length === 0)) {
        const { data: allProjects, error: allErr } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        if (allProjects && allProjects.length > 0) {
          data = allProjects;
        }
      }

      // Load associated payment installments from project_payments table
      const paymentsMap: Record<string, any[]> = {};
      try {
        const { data: payRows } = await supabase
          .from("project_payments")
          .select("*")
          .order("installment_number", { ascending: true });
        if (payRows) {
          payRows.forEach((p: any) => {
            if (!paymentsMap[p.project_id]) paymentsMap[p.project_id] = [];
            paymentsMap[p.project_id].push({
              id: p.id,
              project_id: p.project_id,
              installment_number: p.installment_number,
              title: p.title || `Payment #${p.installment_number}`,
              percentage: Number(p.percentage) || 0,
              amount: Number(p.amount) || 0,
              status: p.status || "pending",
              due_date: p.due_date || null,
              paid_at: p.paid_at || null,
            });
          });
        }
      } catch {}

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
        client_id: row.client_id || null,
        all_members: row.all_members !== undefined ? row.all_members : true,
        member_ids: row.member_ids || [row.owner_id],
        billing_type: row.billing_type || "fixed",
        payment_schedule: row.payment_schedule || "30_days",
        payment_terms_days: row.payment_terms_days || (row.payment_schedule === "weekly" ? 7 : row.payment_schedule === "15_days" ? 15 : 30),
        fixed_price_amount: Number(row.fixed_price_amount) || 0,
        payment_installments_count: Number(row.payment_installments_count) || 1,
        hourly_rate: Number(row.hourly_rate) || 0,
        estimated_hours: Number(row.estimated_hours_per_week || row.estimated_hours) || 0,
        estimated_hours_per_week: Number(row.estimated_hours_per_week || row.estimated_hours) || 0,
        currency: row.currency || "USD",
        payment_status: row.payment_status || "unpaid",
        paid_amount: Number(row.paid_amount) || 0,
        last_payment_date: row.last_payment_date || null,
        enable_currency_conversion: row.enable_currency_conversion || false,
        converted_currency: row.converted_currency || "USD",
        conversion_rate: Number(row.conversion_rate) || 1.0,
        task_types: row.task_types || undefined,
        departments: row.departments || undefined,
        bank_name: row.bank_name || undefined,
        account_name: row.account_name || undefined,
        account_number: row.account_number || undefined,
        bank_iban: row.bank_iban || undefined,
        bank_currency: row.bank_currency || undefined,
        swift_bic: row.swift_bic || undefined,
        routing_number: row.routing_number || undefined,
        installments: paymentsMap[row.id] || row.installments || [],
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
      const payload: Record<string, any> = {
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

      if (project.all_members !== undefined) {
        payload.all_members = project.all_members;
      }
      if (project.client_id !== undefined) payload.client_id = project.client_id || null;
      if (project.billing_type !== undefined) payload.billing_type = project.billing_type;
      if (project.payment_schedule !== undefined) payload.payment_schedule = project.payment_schedule;
      if (project.payment_terms_days !== undefined) payload.payment_terms_days = project.payment_terms_days;
      if (project.fixed_price_amount !== undefined) payload.fixed_price_amount = project.fixed_price_amount;
      if (project.payment_installments_count !== undefined) payload.payment_installments_count = project.payment_installments_count;
      if (project.hourly_rate !== undefined) payload.hourly_rate = project.hourly_rate;
      if (project.estimated_hours_per_week !== undefined) {
        payload.estimated_hours_per_week = project.estimated_hours_per_week;
        payload.estimated_hours = project.estimated_hours_per_week;
      } else if (project.estimated_hours !== undefined) {
        payload.estimated_hours = project.estimated_hours;
        payload.estimated_hours_per_week = project.estimated_hours;
      }
      if (project.currency !== undefined) payload.currency = project.currency;
      if (project.payment_status !== undefined) payload.payment_status = project.payment_status;
      if (project.paid_amount !== undefined) payload.paid_amount = project.paid_amount;
      if (project.last_payment_date !== undefined) payload.last_payment_date = project.last_payment_date;
      if (project.enable_currency_conversion !== undefined) payload.enable_currency_conversion = project.enable_currency_conversion;
      if (project.converted_currency !== undefined) payload.converted_currency = project.converted_currency;
      if (project.conversion_rate !== undefined) payload.conversion_rate = project.conversion_rate;
      if (project.task_types !== undefined) payload.task_types = project.task_types;
      if (project.departments !== undefined) payload.departments = project.departments;
      if (project.bank_name !== undefined) payload.bank_name = project.bank_name;
      if (project.account_name !== undefined) payload.account_name = project.account_name;
      if (project.account_number !== undefined) payload.account_number = project.account_number;
      if (project.bank_iban !== undefined) payload.bank_iban = project.bank_iban;
      if (project.bank_currency !== undefined) payload.bank_currency = project.bank_currency;
      if (project.swift_bic !== undefined) payload.swift_bic = project.swift_bic;
      if (project.routing_number !== undefined) payload.routing_number = project.routing_number;

      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Error creating project in Supabase:", error);
        return null;
      }

      // Persist member assignments to project_members table
      if (project.member_ids && project.member_ids.length > 0) {
        try {
          const memberRows = project.member_ids.map((uid) => ({
            project_id: data.id,
            user_id: uid,
            role: "member",
          }));
          await supabase.from("project_members").upsert(memberRows, { onConflict: "project_id,user_id" });
        } catch {}
      }

      // Persist client association to client_projects table
      if (project.client_id && data?.id) {
        try {
          await supabase.from("client_projects").upsert(
            { client_id: project.client_id, project_id: data.id },
            { onConflict: "client_id,project_id" }
          );
        } catch {}
      }

      // Persist installments to project_payments table
      if (project.installments && project.installments.length > 0 && data?.id) {
        try {
          const rows = project.installments.map((inst) => ({
            project_id: data.id,
            installment_number: inst.installment_number,
            title: inst.title || `Payment #${inst.installment_number}`,
            amount: Number(inst.amount) || 0,
            percentage: Number(inst.percentage) || 0,
            status: inst.status || "pending",
            due_date: inst.due_date || null,
            paid_at: inst.paid_at || null,
          }));
          await supabase.from("project_payments").insert(rows);
        } catch {}
      }

      return {
        ...data,
        all_members: project.all_members !== undefined ? project.all_members : true,
        member_ids: project.member_ids || [project.owner_id || ""],
      };
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
      if (updates.all_members !== undefined) payload.all_members = updates.all_members;
      if (updates.client_id !== undefined) payload.client_id = updates.client_id || null;
      if (updates.billing_type !== undefined) payload.billing_type = updates.billing_type;
      if (updates.payment_schedule !== undefined) payload.payment_schedule = updates.payment_schedule;
      if (updates.payment_terms_days !== undefined) payload.payment_terms_days = updates.payment_terms_days;
      if (updates.fixed_price_amount !== undefined) payload.fixed_price_amount = updates.fixed_price_amount;
      if (updates.payment_installments_count !== undefined) payload.payment_installments_count = updates.payment_installments_count;
      if (updates.hourly_rate !== undefined) payload.hourly_rate = updates.hourly_rate;
      if (updates.estimated_hours_per_week !== undefined) {
        payload.estimated_hours_per_week = updates.estimated_hours_per_week;
        payload.estimated_hours = updates.estimated_hours_per_week;
      } else if (updates.estimated_hours !== undefined) {
        payload.estimated_hours = updates.estimated_hours;
        payload.estimated_hours_per_week = updates.estimated_hours;
      }
      if (updates.currency !== undefined) payload.currency = updates.currency;
      if (updates.payment_status !== undefined) payload.payment_status = updates.payment_status;
      if (updates.paid_amount !== undefined) payload.paid_amount = updates.paid_amount;
      if (updates.last_payment_date !== undefined) payload.last_payment_date = updates.last_payment_date;
      if (updates.enable_currency_conversion !== undefined) payload.enable_currency_conversion = updates.enable_currency_conversion;
      if (updates.converted_currency !== undefined) payload.converted_currency = updates.converted_currency;
      if (updates.conversion_rate !== undefined) payload.conversion_rate = updates.conversion_rate;
      if (updates.task_types !== undefined) payload.task_types = updates.task_types;
      if (updates.departments !== undefined) payload.departments = updates.departments;
      if (updates.bank_name !== undefined) payload.bank_name = updates.bank_name;
      if (updates.account_name !== undefined) payload.account_name = updates.account_name;
      if (updates.account_number !== undefined) payload.account_number = updates.account_number;
      if (updates.bank_iban !== undefined) payload.bank_iban = updates.bank_iban;
      if (updates.bank_currency !== undefined) payload.bank_currency = updates.bank_currency;
      if (updates.swift_bic !== undefined) payload.swift_bic = updates.swift_bic;
      if (updates.routing_number !== undefined) payload.routing_number = updates.routing_number;

      const { error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", id);

      if (error) {
        console.error("Error updating project in Supabase:", error);
        return false;
      }

      if (updates.member_ids !== undefined) {
        try {
          await supabase.from("project_members").delete().eq("project_id", id);
          if (updates.member_ids.length > 0) {
            const memberRows = updates.member_ids.map((uid) => ({
              project_id: id,
              user_id: uid,
              role: "member",
            }));
            await supabase.from("project_members").insert(memberRows);
          }
        } catch {}
      }

      // Sync client association
      if (updates.client_id !== undefined) {
        try {
          await supabase.from("client_projects").delete().eq("project_id", id);
          if (updates.client_id) {
            await supabase.from("client_projects").insert({
              client_id: updates.client_id,
              project_id: id,
            });
          }
        } catch {}
      }

      // Persist installments to project_payments table
      if (updates.installments !== undefined) {
        try {
          await supabase.from("project_payments").delete().eq("project_id", id);
          if (updates.installments.length > 0) {
            const rows = updates.installments.map((inst) => ({
              project_id: id,
              installment_number: inst.installment_number,
              title: inst.title || `Payment #${inst.installment_number}`,
              amount: Number(inst.amount) || 0,
              percentage: Number(inst.percentage) || 0,
              status: inst.status || "pending",
              due_date: inst.due_date || null,
              paid_at: inst.paid_at || null,
            }));
            await supabase.from("project_payments").insert(rows);
          }
        } catch {}
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
