"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  User,
  Workspace,
  Project,
  TaskColumn,
  Task,
  Subtask,
  Comment,
  Note,
  Announcement,
  Notification,
  ActivityLog,
  DashboardWidgetConfig,
  TimeEntry,
  ActiveView,
  ProjectSubTab,
  Role,
  PriorityLevel,
} from "@/types";
import {
  initialUsers,
  initialWorkspaces,
  initialProjects,
  initialColumns,
  initialTasks,
  initialNotes,
  initialAnnouncements,
  initialNotifications,
  initialActivityLogs,
  initialWidgets,
  initialTimeEntries,
} from "@/lib/initialData";
import { generateId } from "@/lib/utils";

interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  startedAt: number;
  seconds: number;
}

interface StoreContextType {
  // Data
  users: User[];
  currentUser: User;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  activeWorkspaceId: string;
  projects: Project[];
  activeProject: Project | null;
  selectedProjectId: string | null;
  columns: TaskColumn[];
  tasks: Task[];
  notes: Note[];
  announcements: Announcement[];
  notifications: Notification[];
  unreadNotificationCount: number;
  activityLogs: ActivityLog[];
  widgets: DashboardWidgetConfig[];
  timeEntries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  theme: "light" | "dark";
  onlineUsers: string[];

  // Navigation & UI State
  activeView: ActiveView;
  projectSubTab: ProjectSubTab;
  editingTask: Task | null;
  searchQuery: string;
  isCommandPaletteOpen: boolean;
  isQuickNoteOpen: boolean;
  isCreateTaskModalOpen: boolean;
  isCreateProjectModalOpen: boolean;
  defaultNewTaskStatus?: string;

  // Actions - Navigation & UI
  setActiveView: (view: ActiveView) => void;
  setSelectedProjectId: (id: string | null) => void;
  setProjectSubTab: (tab: ProjectSubTab) => void;
  setEditingTask: (task: Task | null) => void;
  setSearchQuery: (query: string) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  setIsQuickNoteOpen: (open: boolean) => void;
  setIsCreateTaskModalOpen: (open: boolean, defaultStatus?: string) => void;
  setIsCreateProjectModalOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setCurrentUserId: (id: string) => void;

  // Actions - Workspace
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string, description?: string) => void;
  inviteMember: (email: string, role: Role) => void;
  updateMemberRole: (userId: string, role: Role) => void;
  removeMember: (userId: string) => void;

  // Actions - Projects
  createProject: (projectData: Partial<Project>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
  duplicateProject: (id: string) => void;

  // Actions - Tasks & Kanban
  createTask: (taskData: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, targetStatus: string, newIndex?: number) => void;
  reorderTasksInColumn: (statusKey: string, orderedTaskIds: string[]) => void;
  duplicateTask: (id: string) => void;
  bulkUpdateTasks: (taskIds: string[], updates: Partial<Task>) => void;
  bulkDeleteTasks: (taskIds: string[]) => void;

  // Subtasks & Comments
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addComment: (taskId: string, content: string) => void;
  addCommentReaction: (taskId: string, commentId: string, emoji: string) => void;

  // Columns
  createColumn: (title: string, color?: string) => void;
  updateColumn: (id: string, updates: Partial<TaskColumn>) => void;
  deleteColumn: (id: string) => void;

  // Notes
  createNote: (noteData: Partial<Note>) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;
  convertNoteToTask: (noteId: string, projectId: string) => void;

  // Announcements
  createAnnouncement: (title: string, content: string, priority: "urgent" | "important" | "general", isPinned?: boolean) => void;
  markAnnouncementRead: (id: string) => void;
  addAnnouncementReaction: (id: string, emoji: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;

  // Time Tracking
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  addManualTimeEntry: (taskId: string, durationMinutes: number, description?: string) => void;

  // Dashboard customization
  updateWidgets: (widgets: DashboardWidgetConfig[]) => void;
  resetAllData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = "vinzflow_pm_v2";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Load state from local storage or fallback to initial seed data
  const [isInitialized, setIsInitialized] = useState(false);

  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUserId, setCurrentUserIdState] = useState<string>("user_alex");
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>("ws_main");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [columns, setColumns] = useState<TaskColumn[]>(initialColumns);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialActivityLogs);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(initialWidgets);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(initialTimeEntries);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [onlineUsers] = useState<string[]>(["user_alex", "user_elena", "user_marcus", "user_sarah"]);

  // UI state
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [projectSubTab, setProjectSubTab] = useState<ProjectSubTab>("board");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [defaultNewTaskStatus, setDefaultNewTaskStatus] = useState<string | undefined>(undefined);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.users) setUsers(parsed.users);
        if (parsed.currentUserId) setCurrentUserIdState(parsed.currentUserId);
        if (parsed.workspaces) setWorkspaces(parsed.workspaces);
        if (parsed.activeWorkspaceId) setActiveWorkspaceIdState(parsed.activeWorkspaceId);
        if (parsed.projects) setProjects(parsed.projects);
        if (parsed.columns) setColumns(parsed.columns);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.announcements) setAnnouncements(parsed.announcements);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.activityLogs) setActivityLogs(parsed.activityLogs);
        if (parsed.widgets) setWidgets(parsed.widgets);
        if (parsed.timeEntries) setTimeEntries(parsed.timeEntries);
        if (parsed.theme) setTheme(parsed.theme);
      }
      const savedTheme = localStorage.getItem("vinzflow_theme") as "light" | "dark" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        document.documentElement.classList.add("dark");
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
    setIsInitialized(true);
  }, []);

  // Save changes to LocalStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const payload = {
        users,
        currentUserId,
        workspaces,
        activeWorkspaceId,
        projects,
        columns,
        tasks,
        notes,
        announcements,
        notifications,
        activityLogs,
        widgets,
        timeEntries,
        theme,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }, [
    isInitialized,
    users,
    currentUserId,
    workspaces,
    activeWorkspaceId,
    projects,
    columns,
    tasks,
    notes,
    announcements,
    notifications,
    activityLogs,
    widgets,
    timeEntries,
    theme,
  ]);

  // Real-time multi-tab synchronization using BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("vinzflow_sync_channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "SYNC_STATE") {
        const d = event.data.payload;
        if (d.tasks) setTasks(d.tasks);
        if (d.projects) setProjects(d.projects);
        if (d.notes) setNotes(d.notes);
        if (d.announcements) setAnnouncements(d.announcements);
        if (d.activityLogs) setActivityLogs(d.activityLogs);
        if (d.notifications) setNotifications(d.notifications);
        if (d.timeEntries) setTimeEntries(d.timeEntries);
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  const broadcastSync = useCallback((stateUpdates: any) => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel("vinzflow_sync_channel");
        channel.postMessage({ type: "SYNC_STATE", payload: stateUpdates });
        channel.close();
      } catch (err) {
        console.error("Broadcast failed:", err);
      }
    }
  }, []);

  // Timer Tick effect
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setActiveTimer((prev) => (prev ? { ...prev, seconds: prev.seconds + 1 } : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Derived Values
  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || users[0];
  }, [users, currentUserId]);

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  }, [workspaces, activeWorkspaceId]);

  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read && n.user_id === currentUserId).length;
  }, [notifications, currentUserId]);

  // Helper: Log Activity
  const logActivity = useCallback(
    (action: string, details: string, projectId?: string, taskId?: string) => {
      const newLog: ActivityLog = {
        id: generateId("act"),
        workspace_id: activeWorkspaceId,
        project_id: projectId,
        task_id: taskId,
        user_id: currentUser.id,
        user: currentUser,
        action,
        details,
        created_at: new Date().toISOString(),
      };
      setActivityLogs((prev) => [newLog, ...prev]);
    },
    [activeWorkspaceId, currentUser]
  );

  // Helper: Recalculate Project Progress based on Tasks
  const recalculateProjectProgress = useCallback(
    (projectId: string, currentTasks: Task[]) => {
      const projectTasks = currentTasks.filter((t) => t.project_id === projectId);
      if (projectTasks.length === 0) return;
      const doneCount = projectTasks.filter((t) => t.status === "done").length;
      const progressPercent = Math.round((doneCount / projectTasks.length) * 100);

      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, progress: progressPercent, updated_at: new Date().toISOString() } : p))
      );
    },
    []
  );

  // Theme Toggle
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("vinzflow_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return nextTheme;
    });
  }, []);

  const setCurrentUserId = useCallback((id: string) => {
    setCurrentUserIdState(id);
  }, []);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    setSelectedProjectIdState(null);
  }, []);

  const setSelectedProjectId = useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    if (id) {
      setActiveView("project_detail");
    }
  }, []);

  const openCreateTaskModal = useCallback((open: boolean, defaultStatus?: string) => {
    setDefaultNewTaskStatus(defaultStatus);
    setIsCreateTaskModalOpen(open);
  }, []);

  // --- Project Management ---
  const createProject = useCallback(
    (data: Partial<Project>): Project => {
      const newProj: Project = {
        id: generateId("proj"),
        workspace_id: activeWorkspaceId,
        name: data.name || "Untitled Project",
        description: data.description || "",
        icon: data.icon || "FolderKanban",
        color: data.color || "#6366f1",
        status: data.status || "active",
        priority: data.priority || "medium",
        owner_id: currentUser.id,
        start_date: data.start_date || new Date().toISOString().split("T")[0],
        target_date: data.target_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        progress: 0,
        member_ids: data.member_ids?.length ? data.member_ids : [currentUser.id],
        milestones: data.milestones || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProjects((prev) => [newProj, ...prev]);
      logActivity("project_created", `Created new project "${newProj.name}"`, newProj.id);
      broadcastSync({ projects: [newProj, ...projects] });
      return newProj;
    },
    [activeWorkspaceId, currentUser, logActivity, broadcastSync, projects]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const updated = { ...p, ...updates, updated_at: new Date().toISOString() };
            logActivity("project_updated", `Updated project "${updated.name}"`, id);
            return updated;
          }
          return p;
        })
      );
    },
    [logActivity]
  );

  const deleteProject = useCallback(
    (id: string) => {
      const proj = projects.find((p) => p.id === id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) => prev.filter((t) => t.project_id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectIdState(null);
        setActiveView("projects");
      }
      logActivity("project_deleted", `Deleted project "${proj?.name || id}"`);
    },
    [projects, selectedProjectId, logActivity]
  );

  const archiveProject = useCallback(
    (id: string) => {
      updateProject(id, { status: "archived" });
    },
    [updateProject]
  );

  const duplicateProject = useCallback(
    (id: string) => {
      const source = projects.find((p) => p.id === id);
      if (!source) return;
      const duplicated: Project = {
        ...source,
        id: generateId("proj"),
        name: `${source.name} (Copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProjects((prev) => [duplicated, ...prev]);
      logActivity("project_duplicated", `Duplicated project "${source.name}"`, duplicated.id);
    },
    [projects, logActivity]
  );

  // --- Task & Kanban Management ---
  const createTask = useCallback(
    (data: Partial<Task>): Task => {
      const projectTargetId = data.project_id || selectedProjectId || projects[0]?.id || "proj_mobile";
      const newTask: Task = {
        id: generateId("task"),
        workspace_id: activeWorkspaceId,
        project_id: projectTargetId,
        title: data.title || "New Task",
        description: data.description || "",
        status: data.status || defaultNewTaskStatus || "todo",
        priority: data.priority || "medium",
        order_index: data.order_index ?? 0,
        creator_id: currentUser.id,
        creator: currentUser,
        assignee_ids: data.assignee_ids?.length ? data.assignee_ids : [currentUser.id],
        start_date: data.start_date || new Date().toISOString().split("T")[0],
        due_date: data.due_date,
        labels: data.labels || ["Task"],
        subtasks: data.subtasks || [],
        attachments: data.attachments || [],
        comments: [],
        estimated_hours: data.estimated_hours || 4,
        tracked_seconds: 0,
        dependencies: data.dependencies || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTasks((prev) => {
        const nextTasks = [newTask, ...prev];
        recalculateProjectProgress(projectTargetId, nextTasks);
        broadcastSync({ tasks: nextTasks });
        return nextTasks;
      });

      logActivity("task_created", `Created task "${newTask.title}"`, projectTargetId, newTask.id);

      // Create notification for assignees
      newTask.assignee_ids.forEach((assigneeId) => {
        if (assigneeId !== currentUser.id) {
          const notif: Notification = {
            id: generateId("notif"),
            user_id: assigneeId,
            workspace_id: activeWorkspaceId,
            title: "Task Assigned",
            message: `${currentUser.full_name} assigned you to "${newTask.title}"`,
            type: "task_assigned",
            link_url: `/tasks/${newTask.id}`,
            is_read: false,
            created_at: new Date().toISOString(),
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      });

      return newTask;
    },
    [
      selectedProjectId,
      projects,
      activeWorkspaceId,
      defaultNewTaskStatus,
      currentUser,
      recalculateProjectProgress,
      broadcastSync,
      logActivity,
    ]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      setTasks((prev) => {
        const nextTasks = prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, ...updates, updated_at: new Date().toISOString() };
            return updated;
          }
          return t;
        });

        const targetTask = nextTasks.find((t) => t.id === id);
        if (targetTask) {
          recalculateProjectProgress(targetTask.project_id, nextTasks);
          if (editingTask && editingTask.id === id) {
            setEditingTask(targetTask);
          }
        }
        broadcastSync({ tasks: nextTasks });
        return nextTasks;
      });
      logActivity("task_updated", `Updated task properties`, undefined, id);
    },
    [recalculateProjectProgress, editingTask, broadcastSync, logActivity]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (task) {
          recalculateProjectProgress(task.project_id, next);
        }
        broadcastSync({ tasks: next });
        return next;
      });
      if (editingTask?.id === id) {
        setEditingTask(null);
      }
      logActivity("task_deleted", `Deleted task "${task?.title || id}"`);
    },
    [tasks, editingTask, recalculateProjectProgress, broadcastSync, logActivity]
  );

  const moveTask = useCallback(
    (taskId: string, targetStatus: string, newIndex?: number) => {
      setTasks((prev) => {
        const taskToMove = prev.find((t) => t.id === taskId);
        if (!taskToMove) return prev;

        const otherTasks = prev.filter((t) => t.id !== taskId);
        const columnTasks = otherTasks
          .filter((t) => t.status === targetStatus && t.project_id === taskToMove.project_id)
          .sort((a, b) => a.order_index - b.order_index);

        const insertIndex =
          typeof newIndex === "number" && newIndex >= 0
            ? Math.min(newIndex, columnTasks.length)
            : columnTasks.length;

        columnTasks.splice(insertIndex, 0, {
          ...taskToMove,
          status: targetStatus,
          updated_at: new Date().toISOString(),
        });

        // Re-index column tasks
        const reindexedColumnTasks = columnTasks.map((t, idx) => ({
          ...t,
          order_index: idx,
        }));

        const nonColumnTasks = otherTasks.filter(
          (t) => !(t.status === targetStatus && t.project_id === taskToMove.project_id)
        );

        const nextTasks = [...nonColumnTasks, ...reindexedColumnTasks];
        recalculateProjectProgress(taskToMove.project_id, nextTasks);

        if (editingTask && editingTask.id === taskId) {
          setEditingTask({ ...editingTask, status: targetStatus });
        }

        broadcastSync({ tasks: nextTasks });
        return nextTasks;
      });

      logActivity("task_moved", `Moved task status to "${targetStatus}"`, undefined, taskId);
    },
    [recalculateProjectProgress, editingTask, broadcastSync, logActivity]
  );

  const reorderTasksInColumn = useCallback(
    (statusKey: string, orderedTaskIds: string[]) => {
      setTasks((prev) => {
        const idToIndex = new Map(orderedTaskIds.map((id, idx) => [id, idx]));
        const nextTasks = prev.map((t) => {
          if (idToIndex.has(t.id)) {
            return { ...t, order_index: idToIndex.get(t.id)! };
          }
          return t;
        });
        broadcastSync({ tasks: nextTasks });
        return nextTasks;
      });
    },
    [broadcastSync]
  );

  const duplicateTask = useCallback(
    (id: string) => {
      const source = tasks.find((t) => t.id === id);
      if (!source) return;
      const duplicated: Task = {
        ...source,
        id: generateId("task"),
        title: `${source.title} (Copy)`,
        order_index: source.order_index + 1,
        comments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTasks((prev) => [duplicated, ...prev]);
      logActivity("task_duplicated", `Duplicated task "${source.title}"`, source.project_id, duplicated.id);
    },
    [tasks, logActivity]
  );

  const bulkUpdateTasks = useCallback(
    (taskIds: string[], updates: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((t) => (taskIds.includes(t.id) ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
      );
      logActivity("bulk_task_update", `Updated ${taskIds.length} tasks`);
    },
    [logActivity]
  );

  const bulkDeleteTasks = useCallback(
    (taskIds: string[]) => {
      setTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));
      logActivity("bulk_task_delete", `Deleted ${taskIds.length} tasks`);
    },
    [logActivity]
  );

  // --- Subtasks ---
  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const newSub: Subtask = {
        id: generateId("sub"),
        task_id: taskId,
        title,
        completed: false,
        order_index: 99,
      };
      updateTask(taskId, {
        subtasks: [...(tasks.find((t) => t.id === taskId)?.subtasks || []), newSub],
      });
    },
    [tasks, updateTask]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const nextSubs = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
      updateTask(taskId, { subtasks: nextSubs });
    },
    [tasks, updateTask]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const nextSubs = task.subtasks.filter((s) => s.id !== subtaskId);
      updateTask(taskId, { subtasks: nextSubs });
    },
    [tasks, updateTask]
  );

  // --- Comments ---
  const addComment = useCallback(
    (taskId: string, content: string) => {
      const newComment: Comment = {
        id: generateId("comm"),
        task_id: taskId,
        user_id: currentUser.id,
        user: currentUser,
        content,
        created_at: new Date().toISOString(),
        reactions: [],
      };
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      updateTask(taskId, { comments: [...task.comments, newComment] });
      logActivity("comment_added", `Added a comment on "${task.title}"`, task.project_id, taskId);
    },
    [tasks, currentUser, updateTask, logActivity]
  );

  const addCommentReaction = useCallback(
    (taskId: string, commentId: string, emoji: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const nextComments = task.comments.map((c) => {
        if (c.id === commentId) {
          const reactions = c.reactions || [];
          const existing = reactions.find((r) => r.emoji === emoji);
          let nextReactions;
          if (existing) {
            const hasUser = existing.users.includes(currentUser.id);
            nextReactions = reactions.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    users: hasUser ? r.users.filter((u) => u !== currentUser.id) : [...r.users, currentUser.id],
                  }
                : r
            );
          } else {
            nextReactions = [...reactions, { emoji, users: [currentUser.id] }];
          }
          return { ...c, reactions: nextReactions };
        }
        return c;
      });
      updateTask(taskId, { comments: nextComments });
    },
    [tasks, currentUser, updateTask]
  );

  // --- Columns ---
  const createColumn = useCallback(
    (title: string, color?: string) => {
      const newCol: TaskColumn = {
        id: generateId("col"),
        workspace_id: activeWorkspaceId,
        title,
        status_key: title.toLowerCase().replace(/\s+/g, "_"),
        order_index: columns.length,
        color: color || "#6366f1",
      };
      setColumns((prev) => [...prev, newCol]);
      logActivity("column_created", `Added column "${title}"`);
    },
    [activeWorkspaceId, columns.length, logActivity]
  );

  const updateColumn = useCallback((id: string, updates: Partial<TaskColumn>) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteColumn = useCallback(
    (id: string) => {
      const col = columns.find((c) => c.id === id);
      setColumns((prev) => prev.filter((c) => c.id !== id));
      logActivity("column_deleted", `Removed column "${col?.title || id}"`);
    },
    [columns, logActivity]
  );

  // --- Notes ---
  const createNote = useCallback(
    (data: Partial<Note>): Note => {
      const newNote: Note = {
        id: generateId("note"),
        workspace_id: activeWorkspaceId,
        project_id: data.project_id || selectedProjectId || undefined,
        author_id: currentUser.id,
        author: currentUser,
        title: data.title || "Untitled Note",
        content: data.content || "",
        is_pinned: data.is_pinned ?? false,
        is_private: data.is_private ?? false,
        tags: data.tags || ["General"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      logActivity("note_created", `Created note "${newNote.title}"`);
      return newNote;
    },
    [activeWorkspaceId, selectedProjectId, currentUser, logActivity]
  );

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
    );
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      logActivity("note_deleted", `Deleted note`);
    },
    [logActivity]
  );

  const togglePinNote = useCallback((id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, is_pinned: !n.is_pinned } : n)));
  }, []);

  const convertNoteToTask = useCallback(
    (noteId: string, projectId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      createTask({
        title: note.title,
        description: note.content,
        project_id: projectId,
        labels: note.tags,
      });
      logActivity("note_converted", `Converted note "${note.title}" into a task`, projectId);
    },
    [notes, createTask, logActivity]
  );

  // --- Announcements ---
  const createAnnouncement = useCallback(
    (title: string, content: string, priority: "urgent" | "important" | "general", isPinned?: boolean) => {
      const newAnn: Announcement = {
        id: generateId("ann"),
        workspace_id: activeWorkspaceId,
        author_id: currentUser.id,
        author: currentUser,
        title,
        content,
        priority,
        is_pinned: isPinned ?? false,
        read_by: [currentUser.id],
        reactions: [],
        created_at: new Date().toISOString(),
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      logActivity("announcement_posted", `Posted announcement: "${title}"`);

      // Notify all other users in workspace
      users.forEach((u) => {
        if (u.id !== currentUser.id) {
          const notif: Notification = {
            id: generateId("notif"),
            user_id: u.id,
            workspace_id: activeWorkspaceId,
            title: `New Announcement: ${title}`,
            message: content.substring(0, 80) + "...",
            type: "announcement",
            link_url: "/announcements",
            is_read: false,
            created_at: new Date().toISOString(),
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      });
    },
    [activeWorkspaceId, currentUser, logActivity, users]
  );

  const markAnnouncementRead = useCallback(
    (id: string) => {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id && !a.read_by.includes(currentUser.id) ? { ...a, read_by: [...a.read_by, currentUser.id] } : a))
      );
    },
    [currentUser.id]
  );

  const addAnnouncementReaction = useCallback(
    (id: string, emoji: string) => {
      setAnnouncements((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            const reactions = a.reactions || [];
            const existing = reactions.find((r) => r.emoji === emoji);
            let nextReactions;
            if (existing) {
              const hasReacted = existing.user_ids.includes(currentUser.id);
              nextReactions = reactions.map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: hasReacted ? r.count - 1 : r.count + 1,
                      user_ids: hasReacted ? r.user_ids.filter((u) => u !== currentUser.id) : [...r.user_ids, currentUser.id],
                    }
                  : r
              );
            } else {
              nextReactions = [...reactions, { emoji, count: 1, user_ids: [currentUser.id] }];
            }
            return { ...a, reactions: nextReactions };
          }
          return a;
        })
      );
    },
    [currentUser.id]
  );

  // --- Notifications ---
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.user_id === currentUserId ? { ...n, is_read: true } : n)));
  }, [currentUserId]);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => n.user_id !== currentUserId));
  }, [currentUserId]);

  // --- Time Tracking ---
  const startTimer = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      setActiveTimer({
        taskId,
        taskTitle: task.title,
        startedAt: Date.now(),
        seconds: 0,
      });
      updateTask(taskId, { is_timer_running: true });
    },
    [tasks, updateTask]
  );

  const stopTimer = useCallback(() => {
    if (!activeTimer) return;
    const task = tasks.find((t) => t.id === activeTimer.taskId);
    const durationSeconds = activeTimer.seconds;

    const newEntry: TimeEntry = {
      id: generateId("te"),
      task_id: activeTimer.taskId,
      task_title: activeTimer.taskTitle,
      project_id: task?.project_id,
      project_name: projects.find((p) => p.id === task?.project_id)?.name,
      user_id: currentUser.id,
      user: currentUser,
      description: `Tracked timer session`,
      duration_seconds: durationSeconds,
      started_at: new Date(activeTimer.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    };

    setTimeEntries((prev) => [newEntry, ...prev]);

    if (task) {
      updateTask(task.id, {
        tracked_seconds: (task.tracked_seconds || 0) + durationSeconds,
        is_timer_running: false,
      });
    }

    setActiveTimer(null);
    logActivity("time_tracked", `Tracked ${Math.round(durationSeconds / 60)}m on "${activeTimer.taskTitle}"`);
  }, [activeTimer, tasks, projects, currentUser, updateTask, logActivity]);

  const addManualTimeEntry = useCallback(
    (taskId: string, durationMinutes: number, description?: string) => {
      const task = tasks.find((t) => t.id === taskId);
      const seconds = durationMinutes * 60;
      const newEntry: TimeEntry = {
        id: generateId("te"),
        task_id: taskId,
        task_title: task?.title,
        project_id: task?.project_id,
        project_name: projects.find((p) => p.id === task?.project_id)?.name,
        user_id: currentUser.id,
        user: currentUser,
        description: description || "Manual time entry",
        duration_seconds: seconds,
        started_at: new Date().toISOString(),
        is_billable: true,
      };
      setTimeEntries((prev) => [newEntry, ...prev]);
      if (task) {
        updateTask(taskId, {
          tracked_seconds: (task.tracked_seconds || 0) + seconds,
        });
      }
    },
    [tasks, projects, currentUser, updateTask]
  );

  // --- Workspaces & Members ---
  const createWorkspace = useCallback(
    (name: string, description?: string) => {
      const newWs: Workspace = {
        id: generateId("ws"),
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        description,
        owner_id: currentUser.id,
        plan: "pro",
        created_at: new Date().toISOString(),
      };
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceIdState(newWs.id);
      logActivity("workspace_created", `Created new workspace "${name}"`);
    },
    [currentUser, logActivity]
  );

  const inviteMember = useCallback(
    (email: string, role: Role) => {
      const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) return;
      const name = email.split("@")[0].replace(".", " ");
      const newUser: User = {
        id: generateId("user"),
        email,
        full_name: name.charAt(0).toUpperCase() + name.slice(1),
        role,
        title: "Team Member",
        status: "online",
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      logActivity("member_invited", `Invited ${email} as ${role}`);
    },
    [users, logActivity]
  );

  const updateMemberRole = useCallback((userId: string, role: Role) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  }, []);

  const removeMember = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const updateWidgets = useCallback((newWidgets: DashboardWidgetConfig[]) => {
    setWidgets(newWidgets);
  }, []);

  const resetAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUsers(initialUsers);
    setWorkspaces(initialWorkspaces);
    setProjects(initialProjects);
    setColumns(initialColumns);
    setTasks(initialTasks);
    setNotes(initialNotes);
    setAnnouncements(initialAnnouncements);
    setNotifications(initialNotifications);
    setActivityLogs(initialActivityLogs);
    setWidgets(initialWidgets);
    setTimeEntries(initialTimeEntries);
    setActiveWorkspaceIdState("ws_main");
    setSelectedProjectIdState(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        users,
        currentUser,
        workspaces,
        activeWorkspace,
        activeWorkspaceId,
        projects,
        activeProject,
        selectedProjectId,
        columns,
        tasks,
        notes,
        announcements,
        notifications,
        unreadNotificationCount,
        activityLogs,
        widgets,
        timeEntries,
        activeTimer,
        theme,
        onlineUsers,

        activeView,
        projectSubTab,
        editingTask,
        searchQuery,
        isCommandPaletteOpen,
        isQuickNoteOpen,
        isCreateTaskModalOpen,
        isCreateProjectModalOpen,
        defaultNewTaskStatus,

        setActiveView,
        setSelectedProjectId,
        setProjectSubTab,
        setEditingTask,
        setSearchQuery,
        setIsCommandPaletteOpen,
        setIsQuickNoteOpen,
        setIsCreateTaskModalOpen: openCreateTaskModal,
        setIsCreateProjectModalOpen,
        toggleTheme,
        setCurrentUserId,

        setActiveWorkspaceId,
        createWorkspace,
        inviteMember,
        updateMemberRole,
        removeMember,

        createProject,
        updateProject,
        deleteProject,
        archiveProject,
        duplicateProject,

        createTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTasksInColumn,
        duplicateTask,
        bulkUpdateTasks,
        bulkDeleteTasks,

        addSubtask,
        toggleSubtask,
        deleteSubtask,
        addComment,
        addCommentReaction,

        createColumn,
        updateColumn,
        deleteColumn,

        createNote,
        updateNote,
        deleteNote,
        togglePinNote,
        convertNoteToTask,

        createAnnouncement,
        markAnnouncementRead,
        addAnnouncementReaction,

        markNotificationRead,
        markAllNotificationsRead,
        clearAllNotifications,

        startTimer,
        stopTimer,
        addManualTimeEntry,

        updateWidgets,
        resetAllData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
