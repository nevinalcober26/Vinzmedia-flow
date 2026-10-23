import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Task, Subtask, Comment } from "@/types";

export const taskService = {
  async getTasks(workspaceId: string): Promise<Task[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      // 1. Fetch tasks
      let { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("order_index", { ascending: true });

      if (tasksError) {
        console.error("Error fetching tasks from Supabase:", tasksError);
      }

      // Resilience: If no tasks found for this workspace, fetch all workspace tasks
      if (!tasksData || tasksData.length === 0) {
        const { data: allTasks } = await supabase
          .from("tasks")
          .select("*")
          .order("order_index", { ascending: true });
        if (allTasks && allTasks.length > 0) {
          tasksData = allTasks;
        }
      }

      if (!tasksData || tasksData.length === 0) return [];

      const taskIds = tasksData.map((t) => t.id);

      // 2. Fetch assignees
      const { data: assigneesData } = await supabase
        .from("task_assignees")
        .select("task_id, user_id")
        .in("task_id", taskIds);

      // 3. Fetch subtasks
      const { data: subtasksData } = await supabase
        .from("subtasks")
        .select("*")
        .in("task_id", taskIds)
        .order("order_index", { ascending: true });

      // 4. Fetch comments
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });

      const assigneesByTask: Record<string, string[]> = {};
      (assigneesData || []).forEach((row) => {
        if (!assigneesByTask[row.task_id]) assigneesByTask[row.task_id] = [];
        assigneesByTask[row.task_id].push(row.user_id);
      });

      const subtasksByTask: Record<string, Subtask[]> = {};
      (subtasksData || []).forEach((row) => {
        if (!subtasksByTask[row.task_id]) subtasksByTask[row.task_id] = [];
        subtasksByTask[row.task_id].push({
          id: row.id,
          task_id: row.task_id,
          title: row.title,
          completed: row.completed,
          order_index: row.order_index,
          assignee_id: row.assignee_id || undefined,
          due_date: row.due_date || undefined,
          created_at: row.created_at,
        });
      });

      const commentsByTask: Record<string, Comment[]> = {};
      (commentsData || []).forEach((row) => {
        if (!commentsByTask[row.task_id]) commentsByTask[row.task_id] = [];
        commentsByTask[row.task_id].push({
          id: row.id,
          task_id: row.task_id,
          user_id: row.user_id,
          content: row.content,
          reactions: row.reactions || [],
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
      });

      return tasksData.map((t: any) => ({
        id: t.id,
        workspace_id: t.workspace_id,
        project_id: t.project_id,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        order_index: t.order_index || 0,
        creator_id: t.creator_id,
        assignee_ids: assigneesByTask[t.id] || [],
        start_date: t.start_date || undefined,
        due_date: t.due_date || undefined,
        labels: t.labels || [],
        subtasks: subtasksByTask[t.id] || [],
        comments: commentsByTask[t.id] || [],
        attachments: [],
        estimated_hours: t.estimated_hours ? Number(t.estimated_hours) : undefined,
        tracked_seconds: t.tracked_seconds || 0,
        is_timer_running: t.is_timer_running || false,
        task_type: t.task_type || "Development",
        department: t.department || "Engineering",
        dependencies: t.dependencies || [],
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));
    } catch (err) {
      console.error("taskService.getTasks exception:", err);
      return [];
    }
  },

  async createTask(task: Partial<Task>): Promise<Task | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const payload = {
        id: task.id,
        workspace_id: task.workspace_id,
        project_id: task.project_id,
        title: task.title,
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        order_index: task.order_index || 0,
        creator_id: task.creator_id,
        start_date: task.start_date || null,
        due_date: task.due_date || null,
        labels: task.labels || [],
        estimated_hours: task.estimated_hours || 0,
        tracked_seconds: task.tracked_seconds || 0,
        task_type: task.task_type || "Development",
        department: task.department || "Engineering",
      };

      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) {
        console.error("Error creating task in Supabase:", error);
        return null;
      }

      // Insert assignees if any
      if (task.assignee_ids && task.assignee_ids.length > 0) {
        const rows = task.assignee_ids.map((uid) => ({
          task_id: data.id,
          user_id: uid,
        }));
        await supabase.from("task_assignees").insert(rows);
      }

      return {
        ...data,
        assignee_ids: task.assignee_ids || [],
        subtasks: [],
        comments: [],
        attachments: [],
      };
    } catch (err) {
      console.error("taskService.createTask exception:", err);
      return null;
    }
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload: Record<string, any> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.order_index !== undefined) payload.order_index = updates.order_index;
      if (updates.project_id !== undefined) payload.project_id = updates.project_id;
      if (updates.start_date !== undefined) payload.start_date = updates.start_date || null;
      if (updates.due_date !== undefined) payload.due_date = updates.due_date || null;
      if (updates.labels !== undefined) payload.labels = updates.labels;
      if (updates.estimated_hours !== undefined) payload.estimated_hours = updates.estimated_hours || 0;
      if (updates.tracked_seconds !== undefined) payload.tracked_seconds = updates.tracked_seconds;
      if (updates.is_timer_running !== undefined) payload.is_timer_running = updates.is_timer_running;
      if (updates.task_type !== undefined) payload.task_type = updates.task_type;
      if (updates.department !== undefined) payload.department = updates.department;

      const { error } = await supabase.from("tasks").update(payload).eq("id", id);
      if (error) {
        console.error("Error updating task in Supabase:", error);
        return false;
      }

      // Update assignees if specified
      if (updates.assignee_ids !== undefined) {
        await supabase.from("task_assignees").delete().eq("task_id", id);
        if (updates.assignee_ids.length > 0) {
          const rows = updates.assignee_ids.map((uid) => ({
            task_id: id,
            user_id: uid,
          }));
          await supabase.from("task_assignees").insert(rows);
        }
      }

      return true;
    } catch (err) {
      console.error("taskService.updateTask exception:", err);
      return false;
    }
  },

  async moveTask(id: string, newStatus: string, newIndex?: number, targetDepartment?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const payload: Record<string, any> = {
        status: newStatus,
      };
      if (newIndex !== undefined) payload.order_index = newIndex;
      if (targetDepartment !== undefined) payload.department = targetDepartment;

      const { error } = await supabase.from("tasks").update(payload).eq("id", id);
      return !error;
    } catch (err) {
      console.error("taskService.moveTask exception:", err);
      return false;
    }
  },

  async deleteTask(id: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      return !error;
    } catch (err) {
      console.error("taskService.deleteTask exception:", err);
      return false;
    }
  },

  async addSubtask(taskId: string, title: string): Promise<Subtask | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id: taskId, title, completed: false })
        .select()
        .single();
      if (error) return null;
      return {
        id: data.id,
        task_id: data.task_id,
        title: data.title,
        completed: data.completed,
        order_index: data.order_index,
        created_at: data.created_at,
      };
    } catch {
      return null;
    }
  },

  async toggleSubtask(subtaskId: string, completed: boolean): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase
        .from("subtasks")
        .update({ completed })
        .eq("id", subtaskId);
      return !error;
    } catch {
      return false;
    }
  },

  async deleteSubtask(subtaskId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
      return !error;
    } catch {
      return false;
    }
  },

  async addComment(taskId: string, userId: string, content: string): Promise<Comment | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ task_id: taskId, user_id: userId, content, reactions: [] })
        .select()
        .single();
      if (error) return null;
      return {
        id: data.id,
        task_id: data.task_id,
        user_id: data.user_id,
        content: data.content,
        reactions: [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch {
      return null;
    }
  },
};
