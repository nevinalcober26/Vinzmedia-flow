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
  NotificationType,
  ActivityLog,
  DashboardWidgetConfig,
  TimeEntry,
  ActiveView,
  ProjectSubTab,
  Role,
  PriorityLevel,
  Client,
  ProjectFile,
  WorkspaceInvite,
  ProjectPaymentInstallment,
} from "@/types";
import {
  initialColumns,
  initialWidgets,
} from "@/lib/initialData";
import { generateId, isOverdue, formatShortDate } from "@/lib/utils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { projectService } from "@/lib/services/projectService";
import { taskService } from "@/lib/services/taskService";
import { clientService } from "@/lib/services/clientService";
import { fileService } from "@/lib/services/fileService";
import { noteService } from "@/lib/services/noteService";
import { timeEntryService } from "@/lib/services/timeEntryService";
import { workspaceService } from "@/lib/services/workspaceService";
import { authService } from "@/lib/services/authService";
import { inviteService } from "@/lib/services/inviteService";
import { useToast } from "@/context/ToastContext";
import {
  syncTaskToSupabase,
  syncProjectToSupabase,
  syncNoteToSupabase,
  syncAnnouncementToSupabase,
} from "@/lib/databaseSync";
import { hasPermission } from "@/lib/permissions";

interface ActiveTimer {
  taskId?: string;
  projectId: string;
  projectName: string;
  taskTitle: string;
  summary: string;
  startedAt: number;
  seconds: number;
}

interface StoreContextType {
  // Auth & RBAC
  isAuthenticated: boolean;
  currentUser: User;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; pendingApproval?: boolean; error?: string }>;
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    role: Role;
    title?: string;
    department?: string;
  }) => Promise<boolean>;
  logout: () => void;
  demoLogin: (role: Role) => void;

  // Invites & Approvals
  pendingApprovals: User[];
  activeInvites: WorkspaceInvite[];
  createInviteLink: (email: string, role?: Role) => Promise<{ invite: WorkspaceInvite; inviteUrl: string }>;
  approveMember: (applicant: User) => Promise<boolean>;
  rejectMember: (applicantId: string, email: string) => Promise<boolean>;
  revokeInvite: (inviteId: string) => void;
  refreshTeamData: () => Promise<void>;

  // Data
  users: User[];
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  activeWorkspaceId: string;
  projects: Project[];
  allProjects?: Project[];
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
  clients: Client[];
  files: ProjectFile[];
  activeTimer: ActiveTimer | null;
  theme: "light" | "dark";
  onlineUsers: string[];

  // Navigation & UI State
  activeView: ActiveView;
  isViewLoading: boolean;
  isInitialized: boolean;
  projectSubTab: ProjectSubTab;
  editingTask: Task | null;
  searchQuery: string;
  isCommandPaletteOpen: boolean;
  isQuickNoteOpen: boolean;
  isCreateTaskModalOpen: boolean;
  isCreateProjectModalOpen: boolean;
  isProfileModalOpen: boolean;
  defaultNewTaskStatus?: string;
  defaultNewTaskDueDate?: string;

  // Actions - Navigation & UI
  setActiveView: (view: ActiveView) => void;
  setSelectedProjectId: (id: string | null) => void;
  setProjectSubTab: (tab: ProjectSubTab) => void;
  setEditingTask: (task: Task | null) => void;
  setSearchQuery: (query: string) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  setIsQuickNoteOpen: (open: boolean) => void;
  setIsCreateTaskModalOpen: (open: boolean, defaultStatus?: string, defaultDueDate?: string) => void;
  setIsCreateProjectModalOpen: (open: boolean) => void;
  setIsProfileModalOpen: (open: boolean) => void;
  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  toggleTheme: () => void;
  setCurrentUserId: (id: string) => void;

  // Actions - Workspace
  setActiveWorkspaceId: (id: string) => void;
  createWorkspace: (name: string, description?: string) => void;
  inviteMember: (email: string, role: Role) => void;
  updateMemberRole: (userId: string, role: Role) => void;
  removeMember: (userId: string) => void;

  // Actions - Projects
  createProject: (projectData: Partial<Project>) => Project | null;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  togglePaymentPaid: (projectId: string, isPaid?: boolean) => void;
  toggleInstallmentPaid: (projectId: string, installmentNumber: number) => void;

  // Actions - Tasks & Kanban
  createTask: (taskData: Partial<Task>) => Task | null;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, targetStatus: string, newIndex?: number, targetDepartment?: string) => void;
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
  addNotification: (notification: {
    id?: string;
    user_id?: string;
    title: string;
    message: string;
    type?: NotificationType;
    link_url?: string;
  }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;

  // Time Tracking
  startTimer: (taskId: string) => void;
  startProjectTimer: (projectId: string, summary: string) => boolean;
  updateTimerSummary: (summary: string) => void;
  stopTimer: (summary?: string) => void;
  addManualTimeEntry: (taskId: string, durationMinutes: number, description?: string, customDate?: string) => void;

  // Clients & Files / Media
  createClient: (clientData: Partial<Client>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  uploadFile: (fileData: {
    name: string;
    size: number;
    type: string;
    url: string;
    project_id?: string;
    client_id?: string;
    task_id?: string;
  }) => ProjectFile;
  deleteFile: (id: string) => void;

  // Dashboard customization
  updateWidgets: (widgets: DashboardWidgetConfig[]) => void;
  resetAllData: () => void;

  // Toast notifications
  toast: ReturnType<typeof useToast>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = "vinzflow_pm_v2";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Core collections (Live dynamic data loaded from Supabase)
  const [users, setUsers] = useState<User[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<User[]>([]);
  const [activeInvites, setActiveInvites] = useState<WorkspaceInvite[]>([]);
  const [currentUserId, setCurrentUserIdState] = useState<string>("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>("b0000000-0000-0000-0000-000000000001");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [columns, setColumns] = useState<TaskColumn[]>(initialColumns);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(initialWidgets);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeEntriesLoadedFor, setTimeEntriesLoadedFor] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [onlineUsers] = useState<string[]>([]);

  // UI state
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [isViewLoading, setIsViewLoading] = useState(false);

  const handleSetActiveView = useCallback((view: ActiveView) => {
    setIsViewLoading(true);
    setActiveView(view);
    const timer = setTimeout(() => {
      setIsViewLoading(false);
    }, 240);
    return () => clearTimeout(timer);
  }, []);
  const [projectSubTab, setProjectSubTab] = useState<ProjectSubTab>("board");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [defaultNewTaskStatus, setDefaultNewTaskStatus] = useState<string | undefined>(undefined);
  const [defaultNewTaskDueDate, setDefaultNewTaskDueDate] = useState<string | undefined>(undefined);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Initialize dynamic data from Supabase & configure real-time updates
  useEffect(() => {
    // 1. Theme initialization
    try {
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
    } catch {}

    // 2. Fetch real dynamic database tables from Supabase
    const activeWsRef = { current: "b0000000-0000-0000-0000-000000000001" };
    const loadDynamicData = async () => {
      let targetWsId = "b0000000-0000-0000-0000-000000000001";
      if (isSupabaseConfigured && supabase) {
        try {
          const [dbWorkspaces, dbUsers, pending, invites] = await Promise.all([
            workspaceService.getWorkspaces(),
            workspaceService.getUsers(),
            inviteService.getPendingApprovals(targetWsId),
            Promise.resolve(inviteService.getActiveInvites(targetWsId)),
          ]);

          if (dbWorkspaces && dbWorkspaces.length > 0) {
            setWorkspaces(dbWorkspaces);
            targetWsId = dbWorkspaces[0].id;
            activeWsRef.current = targetWsId;
            setActiveWorkspaceIdState(targetWsId);
          }

          if (dbUsers && dbUsers.length > 0) {
            const approved = dbUsers.filter((u) => u.approval_status !== "pending");
            setUsers(approved);
            if (approved.length > 0) {
              setCurrentUserIdState(approved[0].id);
            }
          }

          setPendingApprovals(pending || []);
          setActiveInvites(invites || []);

          const [dbProjects, dbTasks, dbClients, dbFiles, dbNotes, dbAnnouncements, dbLogs] = await Promise.all([
            projectService.getProjects(targetWsId),
            taskService.getTasks(targetWsId),
            clientService.getClients(targetWsId),
            fileService.getFiles(targetWsId),
            noteService.getNotes(targetWsId),
            workspaceService.getAnnouncements(targetWsId),
            workspaceService.getActivityLogs(targetWsId),
          ]);

          if (dbProjects) setProjects(dbProjects);
          if (dbTasks) setTasks(dbTasks);
          if (dbClients) setClients(dbClients);
          if (dbFiles) setFiles(dbFiles);
          if (dbNotes) setNotes(dbNotes);
          if (dbAnnouncements) setAnnouncements(dbAnnouncements);
          if (dbLogs) setActivityLogs(dbLogs);

          if (isSupabaseConfigured && supabase) {
            try {
              const { data: dbNotifs } = await supabase
                .from("notifications")
                .select("*")
                .eq("workspace_id", targetWsId)
                .order("created_at", { ascending: false })
                .limit(50);
              if (dbNotifs && dbNotifs.length > 0) {
                setNotifications(dbNotifs);
              }
            } catch {}
          }
        } catch (err) {
          console.error("Failed to fetch dynamic data from Supabase:", err);
        }
      }
      setIsInitialized(true);
    };

    loadDynamicData();

    // 3. Supabase Auth listener
    let authSub: any = null;
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUserIdState(session.user.id);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUserIdState(session.user.id);
        }
      });
      authSub = subscription;
    }

    // 4. Supabase Real-Time Live Sync
    let realtimeChannel: any = null;
    if (isSupabaseConfigured && supabase) {
      realtimeChannel = supabase
        .channel("vinzflow_realtime_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, async () => {
          const currentWs = activeWsRef.current || "b0000000-0000-0000-0000-000000000001";
          const freshTasks = await taskService.getTasks(currentWs);
          if (freshTasks && freshTasks.length > 0) {
            setTasks(freshTasks);
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, async () => {
          const currentWs = activeWsRef.current || "b0000000-0000-0000-0000-000000000001";
          const freshProjects = await projectService.getProjects(currentWs);
          if (freshProjects && freshProjects.length > 0) {
            setProjects(freshProjects);
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "files" }, async () => {
          const currentWs = activeWsRef.current || "b0000000-0000-0000-0000-000000000001";
          const freshFiles = await fileService.getFiles(currentWs);
          if (freshFiles && freshFiles.length > 0) {
            setFiles(freshFiles);
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, async () => {
          const currentWs = activeWsRef.current || "b0000000-0000-0000-0000-000000000001";
          const freshClients = await clientService.getClients(currentWs);
          if (freshClients && freshClients.length > 0) {
            setClients(freshClients);
          }
        })
        .subscribe();
    }

    return () => {
      authSub?.unsubscribe();
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  // Keep the stopwatch and recent sessions available after a refresh. Supabase is
  // the shared source once the project timeclock SQL has been installed.
  useEffect(() => {
    if (!isInitialized) return;
    const workspaceId = activeWorkspaceId;
    setTimeEntriesLoadedFor(null);
    try {
      const savedEntries = localStorage.getItem(`vinzflow_time_entries_${workspaceId}`);
      const legacy = savedEntries ? null : JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const cached = savedEntries ? JSON.parse(savedEntries) : (legacy?.timeEntries || []).filter((entry: TimeEntry) =>
        entry.workspace_id === workspaceId || (legacy?.projects || []).some((project: Project) => project.id === entry.project_id && project.workspace_id === workspaceId));
      setTimeEntries(Array.isArray(cached) ? cached : []);
      const savedTimer = JSON.parse(localStorage.getItem(`vinzflow_active_timer_${workspaceId}`) || "null");
      setActiveTimer(savedTimer?.startedAt && savedTimer?.projectId
        ? { ...savedTimer, seconds: Math.max(0, Math.floor((Date.now() - savedTimer.startedAt) / 1000)) }
        : null);
    } catch {
      setTimeEntries([]);
      setActiveTimer(null);
    }
    setTimeEntriesLoadedFor(workspaceId);
    let cancelled = false;
    timeEntryService.getTimeEntries(workspaceId).then((remote) => {
      if (cancelled || !remote) return;
      setTimeEntries((local) => {
        const entries = new Map(local.map((entry) => [entry.id, entry]));
        remote.forEach((entry) => entries.set(entry.id, entry));
        return Array.from(entries.values()).sort((a, b) => b.started_at.localeCompare(a.started_at));
      });
    });
    return () => { cancelled = true; };
  }, [isInitialized, activeWorkspaceId]);

  useEffect(() => {
    if (timeEntriesLoadedFor !== activeWorkspaceId) return;
    localStorage.setItem(`vinzflow_time_entries_${activeWorkspaceId}`, JSON.stringify(timeEntries));
  }, [timeEntries, activeWorkspaceId, timeEntriesLoadedFor]);

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
        clients,
        files,
        theme,
        isAuthenticated,
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
    clients,
    files,
    theme,
    isAuthenticated,
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
        if (d.clients) setClients(d.clients);
        if (d.files) setFiles(d.files);
        if (d.users) setUsers(d.users);
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
  const timerStartedAt = activeTimer?.startedAt;
  useEffect(() => {
    if (!timerStartedAt) return;
    const interval = setInterval(() => {
      setActiveTimer((prev) => (prev ? { ...prev, seconds: Math.max(0, Math.floor((Date.now() - prev.startedAt) / 1000)) } : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStartedAt]);

  // Derived Values
  const currentUser = useMemo((): User => {
    return (
      users.find((u) => u.id === currentUserId) ||
      users[0] || {
        id: "a0000000-0000-0000-0000-000000000001",
        email: "vinz@vinzmedia.com",
        full_name: "Vinz Media",
        username: "vinzmedia",
        role: "owner" as Role,
        title: "Founder & Workspace Owner",
        department: "Executive",
        status: "online" as const,
        approval_status: "approved",
        created_at: new Date().toISOString(),
      }
    );
  }, [users, currentUserId]);

  const activeWorkspace = useMemo((): Workspace => {
    return (
      workspaces.find((w) => w.id === activeWorkspaceId) ||
      workspaces[0] || {
        id: "b0000000-0000-0000-0000-000000000001",
        name: "VinzMedia Workspace",
        slug: "vinzmedia-hq",
        owner_id: "a0000000-0000-0000-0000-000000000001",
        plan: "enterprise" as const,
        created_at: new Date().toISOString(),
      }
    );
  }, [workspaces, activeWorkspaceId]);

  // User-filtered projects based on RBAC & Project Member Assignment
  const visibleProjects = useMemo(() => {
    // Owners and Admins always see all workspace projects
    if (currentUser.role === "owner" || currentUser.role === "admin") {
      return projects;
    }
    // Regular members, project managers, and guests see projects where:
    // 1. all_members is true (or undefined = public to workspace)
    // 2. OR user is the project owner
    // 3. OR user's id is present in member_ids
    return projects.filter((p) => {
      if (p.all_members !== false && (p.all_members === true || !p.member_ids || p.member_ids.length === 0)) {
        return true;
      }
      return p.owner_id === currentUser.id || (p.member_ids || []).includes(currentUser.id);
    });
  }, [projects, currentUser]);

  // Tasks scoped to visible projects
  const visibleTasks = useMemo(() => {
    if (currentUser.role === "owner" || currentUser.role === "admin") {
      return tasks;
    }
    const visibleProjIds = new Set(visibleProjects.map((p) => p.id));
    return tasks.filter((t) => !t.project_id || visibleProjIds.has(t.project_id));
  }, [tasks, visibleProjects, currentUser.role]);

  // Files scoped to visible projects
  const visibleFiles = useMemo(() => {
    if (currentUser.role === "owner" || currentUser.role === "admin") {
      return files;
    }
    const visibleProjIds = new Set(visibleProjects.map((p) => p.id));
    return files.filter((f) => !f.project_id || visibleProjIds.has(f.project_id));
  }, [files, visibleProjects, currentUser.role]);

  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return visibleProjects.find((p) => p.id === selectedProjectId) || null;
  }, [visibleProjects, selectedProjectId]);

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
        prev.map((p) => {
          if (p.id === projectId) {
            const updated = { ...p, progress: progressPercent, updated_at: new Date().toISOString() };
            syncProjectToSupabase(updated);
            return updated;
          }
          return p;
        })
      );
    },
    []
  );

  // --- Auth & RBAC Actions ---
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; pendingApproval?: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Check if user is in pending approvals
      const pendingList = await inviteService.getPendingApprovals(activeWorkspaceId);
      const isPending = pendingList.some((p) => p.email.toLowerCase() === cleanEmail);
      if (isPending) {
        toast.warning(
          "Account Pending Approval",
          "Your account is awaiting administrator review and approval."
        );
        return {
          success: false,
          pendingApproval: true,
          error: "Your account is currently awaiting administrator review and approval.",
        };
      }

      // 2. Try Supabase Auth
      const res = await authService.signIn(cleanEmail, password);
      if (res.user) {
        if (res.user.approval_status === "pending") {
          toast.warning(
            "Account Pending Approval",
            "An administrator must approve your account before you can sign in."
          );
          return {
            success: false,
            pendingApproval: true,
            error: "An administrator must approve your account before you can sign in.",
          };
        }
        setIsAuthenticated(true);
        setCurrentUserIdState(res.user.id);
        setUsers((prev) => {
          if (!prev.some((u) => u.id === res.user?.id)) {
            return [res.user!, ...prev];
          }
          return prev;
        });
        logActivity("user_login", `${res.user.full_name} signed in`);
        toast.success("Welcome back!", `Signed in as ${res.user.full_name}`);
        return { success: true };
      }

      // 3. Default secure account fallback (Owner)
      if (cleanEmail === "vinz@vinzmedia.com" && password === "KurtMarx2020!") {
        const defaultOwner: User = {
          id: "a0000000-0000-0000-0000-000000000001",
          email: "vinz@vinzmedia.com",
          full_name: "Vinz Media",
          username: "vinzmedia",
          avatar_url: "",
          role: "owner",
          title: "Founder & Workspace Owner",
          department: "Executive",
          status: "online",
          approval_status: "approved",
          created_at: new Date().toISOString(),
        };
        setIsAuthenticated(true);
        setCurrentUserIdState(defaultOwner.id);
        setUsers((prev) => (prev.some((u) => u.id === defaultOwner.id) ? prev : [defaultOwner, ...prev]));
        logActivity("user_login", `${defaultOwner.full_name} signed in`);
        toast.success("Welcome back, Vinz!", "Successfully signed in to workspace.");
        return { success: true };
      }

      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        if (existing.approval_status === "pending") {
          toast.warning("Account Pending Approval", "Your account is awaiting administrator review.");
          return {
            success: false,
            pendingApproval: true,
            error: "Your account is awaiting administrator review and approval.",
          };
        }
        setCurrentUserIdState(existing.id);
        setIsAuthenticated(true);
        logActivity("user_login", `${existing.full_name} signed in`);
        toast.success("Welcome back!", `Signed in as ${existing.full_name}`);
        return { success: true };
      }

      toast.error("Sign In Failed", "Invalid email or password.");
      return { success: false, error: "Invalid email or password." };
    },
    [users, logActivity, activeWorkspaceId, toast]
  );

  const signup = useCallback(
    async (data: {
      email: string;
      password: string;
      full_name: string;
      role: Role;
      title?: string;
      department?: string;
    }): Promise<boolean> => {
      const res = await authService.signUp(data);
      if (res.user) {
        setIsAuthenticated(true);
        setCurrentUserIdState(res.user.id);
        setUsers((prev) => [res.user!, ...prev]);
        logActivity("user_registered", `${res.user.full_name} joined workspace as ${res.user.role}`);
        addNotification({
          id: `notif_new_team_${res.user.id}`,
          title: `New Team Member Added: ${res.user.full_name}`,
          message: `${res.user.full_name} joined the workspace as ${res.user.role}.`,
          type: "team",
          link_url: "/team",
        });
        return true;
      }

      const newUserId = generateId();
      const newUser: User = {
        id: newUserId,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        title: data.title || "Team Member",
        department: data.department || "Engineering",
        status: "online",
        created_at: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      setCurrentUserIdState(newUser.id);
      setIsAuthenticated(true);
      return true;
    },
    [logActivity]
  );

  const logout = useCallback(() => {
    authService.signOut().catch(() => {});
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  const demoLogin = useCallback(
    (role: Role) => {
      const targetUser = users.find((u) => u.role === role) || users[0];
      setCurrentUserIdState(targetUser.id);
      setIsAuthenticated(true);
      logActivity("demo_switch", `Switched persona to ${targetUser.full_name} (${role})`);
    },
    [users, logActivity]
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

  const openCreateTaskModal = useCallback((open: boolean, defaultStatus?: string, defaultDueDate?: string) => {
    setDefaultNewTaskStatus(defaultStatus);
    setDefaultNewTaskDueDate(defaultDueDate);
    setIsCreateTaskModalOpen(open);
  }, []);

  const updateUserProfile = useCallback(
    async (updates: Partial<User>): Promise<boolean> => {
      try {
        const updatedUser: User = { ...currentUser, ...updates };
        setUsers((prev) => {
          const index = prev.findIndex((u) => u.id === currentUser.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedUser;
            return next;
          }
          return [updatedUser, ...prev];
        });

        if (isSupabaseConfigured && supabase) {
          const payload: any = {
            full_name: updatedUser.full_name,
            title: updatedUser.title,
            department: updatedUser.department,
            status: updatedUser.status,
            avatar_url: updatedUser.avatar_url || null,
            updated_at: new Date().toISOString(),
          };
          if (updates.username) {
            payload.username = updates.username;
          }
          await supabase.from("profiles").update(payload).eq("id", currentUser.id);
        }

        logActivity("profile_updated", `Updated profile details for ${updatedUser.full_name}`);
        toast.success("Profile Updated!", "Your avatar and details have been saved.");
        broadcastSync({ users: users.map((u) => (u.id === currentUser.id ? updatedUser : u)) });
        return true;
      } catch (err: any) {
        console.error("Profile update error:", err);
        toast.error("Failed to update profile", err?.message);
        return false;
      }
    },
    [currentUser, logActivity, toast, broadcastSync, users]
  );

  // --- Project Management with RBAC & Supabase Sync ---
  const createProject = useCallback(
    (data: Partial<Project>): Project | null => {
      if (!hasPermission(currentUser.role, "project:create")) {
        toast.error("Permission Denied", `Users with role "${currentUser.role}" cannot create projects.`);
        return null;
      }

      const newProjId = generateId();
      const newProj: Project = {
        id: newProjId,
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
        all_members: data.all_members !== undefined ? data.all_members : true,
        member_ids: data.member_ids?.length ? data.member_ids : [currentUser.id],
        client_id: data.client_id || undefined,
        billing_type: data.billing_type || "fixed",
        payment_schedule: data.payment_schedule || "30_days",
        payment_terms_days: data.payment_terms_days || (data.payment_schedule === "weekly" ? 7 : data.payment_schedule === "15_days" ? 15 : 30),
        fixed_price_amount: data.fixed_price_amount || 0,
        payment_installments_count: data.payment_installments_count || 1,
        installments: data.installments || [],
        hourly_rate: data.hourly_rate || 0,
        estimated_hours: data.estimated_hours || 0,
        currency: data.currency || "USD",
        milestones: data.milestones || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProjects((prev) => [newProj, ...prev]);
      if (newProj.client_id) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === newProj.client_id && !c.project_ids.includes(newProjId)
              ? { ...c, project_ids: [...c.project_ids, newProjId] }
              : c
          )
        );
      }
      logActivity("project_created", `Created new project "${newProj.name}"`, newProj.id);
      projectService.createProject(newProj);
      broadcastSync({ projects: [newProj, ...projects] });
      toast.success("Project Created", `Project "${newProj.name}" created successfully.`);
      return newProj;
    },
    [currentUser.role, activeWorkspaceId, currentUser.id, logActivity, broadcastSync, projects, toast]
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      if (!hasPermission(currentUser.role, "project:edit")) {
        toast.error("Permission Denied", "Your role does not allow editing project properties.");
        return;
      }
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            const updated = { ...p, ...updates, updated_at: new Date().toISOString() };
            logActivity("project_updated", `Updated project "${updated.name}"`, id);
            projectService.updateProject(id, updates);

            // Notify when team members are added to the project
            if (updates.member_ids && updates.member_ids.length > 0) {
              const prevMembers = p.member_ids || [];
              const added = updates.member_ids.filter((uid) => !prevMembers.includes(uid));
              if (added.length > 0) {
                const names = users.filter((u) => added.includes(u.id)).map((u) => u.full_name).join(", ");
                addNotification({
                  title: `New Team Added: ${updated.name}`,
                  message: `${names || "New team member(s)"} joined the ${updated.name} project team.`,
                  type: "team",
                  link_url: "/projects",
                });
              }
            }

            toast.success("Project Updated", `Updated "${updated.name}"`);
            return updated;
          }
          return p;
        })
      );
      if (updates.client_id !== undefined) {
        setClients((prev) =>
          prev.map((c) => {
            if (c.id === updates.client_id) {
              return c.project_ids.includes(id) ? c : { ...c, project_ids: [...c.project_ids, id] };
            } else {
              return { ...c, project_ids: c.project_ids.filter((pid) => pid !== id) };
            }
          })
        );
      }
    },
    [currentUser.role, logActivity, toast]
  );

  const deleteProject = useCallback(
    (id: string) => {
      if (!hasPermission(currentUser.role, "project:delete")) {
        toast.error("Permission Denied", "Only Workspace Owners and Admins can delete projects.");
        return;
      }
      const proj = projects.find((p) => p.id === id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTasks((prev) => prev.filter((t) => t.project_id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectIdState(null);
        setActiveView("projects");
      }
      projectService.deleteProject(id);
      logActivity("project_deleted", `Deleted project "${proj?.name || id}"`);
      toast.delete("Project Deleted", `Project "${proj?.name || "Project"}" was deleted.`);
    },
    [currentUser.role, projects, selectedProjectId, logActivity, toast]
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
      syncProjectToSupabase(duplicated);
    },
    [projects, logActivity]
  );

  const togglePaymentPaid = useCallback(
    (projectId: string, isPaid?: boolean) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
      const willBePaid = isPaid !== undefined ? isPaid : proj.payment_status !== "paid";
      const newStatus = willBePaid ? ("paid" as const) : ("unpaid" as const);
      const totalAmount =
        proj.billing_type === "fixed"
          ? proj.fixed_price_amount || 0
          : 0;
      const updates: Partial<Project> = {
        payment_status: newStatus,
        paid_amount: willBePaid ? totalAmount : 0,
        last_payment_date: willBePaid ? new Date().toISOString() : undefined,
      };
      updateProject(projectId, updates);
      toast.success(
        willBePaid ? "Marked as Paid" : "Marked as Unpaid",
        `Project "${proj.name}" payment status updated to ${newStatus}`
      );
    },
    [projects, updateProject, toast]
  );

  const toggleInstallmentPaid = useCallback(
    (projectId: string, installmentNumber: number) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;
      const count = proj.payment_installments_count || 1;
      const existingInst = proj.installments || [];
      const perInstAmount = (proj.fixed_price_amount || 0) / count;

      const installments: ProjectPaymentInstallment[] = Array.from({ length: count }).map((_, idx) => {
        const num = idx + 1;
        const found = existingInst.find((inst) => inst.installment_number === num);
        return (
          found || {
            id: `inst_${proj.id}_${num}`,
            project_id: proj.id,
            installment_number: num,
            title: `Payment #${num}`,
            amount: perInstAmount,
            status: "pending" as const,
          }
        );
      });

      const target = installments.find((inst) => inst.installment_number === installmentNumber);
      if (!target) return;
      const willBePaid = target.status !== "paid";
      target.status = willBePaid ? "paid" : "pending";
      target.paid_at = willBePaid ? new Date().toISOString() : undefined;

      const paidCount = installments.filter((i) => i.status === "paid").length;
      const paidTotal = installments
        .filter((i) => i.status === "paid")
        .reduce((acc, i) => acc + i.amount, 0);
      const overallStatus =
        paidCount === count ? ("paid" as const) : paidCount > 0 ? ("partially_paid" as const) : ("unpaid" as const);

      const updates: Partial<Project> = {
        installments,
        payment_status: overallStatus,
        paid_amount: paidTotal,
        last_payment_date: willBePaid ? new Date().toISOString() : proj.last_payment_date,
      };

      updateProject(projectId, updates);
      toast.success(
        willBePaid ? "Installment Paid" : "Installment Marked Pending",
        `Payment #${installmentNumber} of "${proj.name}" is now ${target.status}`
      );
    },
    [projects, updateProject, toast]
  );

  // --- Task & Kanban Management with RBAC & Supabase Sync ---
  const createTask = useCallback(
    (data: Partial<Task>): Task | null => {
      if (!hasPermission(currentUser.role, "task:create")) {
        toast.error("Permission Denied", "Guests cannot create tasks.");
        return null;
      }

      const projectTargetId = data.project_id || selectedProjectId || projects[0]?.id || "proj_mobile";
      const newTaskId = generateId();
      const newTask: Task = {
        id: newTaskId,
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
        task_type: data.task_type || "Development",
        department: data.department || "Engineering",
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

      taskService.createTask(newTask);
      logActivity("task_created", `Created task "${newTask.title}"`, projectTargetId, newTask.id);
      toast.success("Task Created", `Added task "${newTask.title}"`);

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
      currentUser.role,
      selectedProjectId,
      projects,
      activeWorkspaceId,
      defaultNewTaskStatus,
      currentUser,
      recalculateProjectProgress,
      broadcastSync,
      logActivity,
      toast,
    ]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      if (!hasPermission(currentUser.role, "task:edit")) {
        toast.error("Permission Denied", "Guests cannot modify task fields.");
        return;
      }

      setTasks((prev) => {
        const nextTasks = prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, ...updates, updated_at: new Date().toISOString() };
            taskService.updateTask(id, updates);
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
    [currentUser.role, recalculateProjectProgress, editingTask, broadcastSync, logActivity, toast]
  );

  const deleteTask = useCallback(
    (id: string) => {
      if (!hasPermission(currentUser.role, "task:delete")) {
        toast.error("Permission Denied", "Your role does not permit deleting tasks.");
        return;
      }

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
      taskService.deleteTask(id);
      logActivity("task_deleted", `Deleted task "${task?.title || id}"`);
      toast.delete("Task Deleted", `Task "${task?.title || "Task"}" deleted.`);
    },
    [currentUser.role, tasks, editingTask, recalculateProjectProgress, broadcastSync, logActivity, toast]
  );

  const moveTask = useCallback(
    (taskId: string, targetStatus: string, newIndex?: number, targetDepartment?: string) => {
      if (!hasPermission(currentUser.role, "task:move")) {
        toast.error("Permission Denied", "Guests cannot move board columns.");
        return;
      }

      setTasks((prev) => {
        const taskToMove = prev.find((t) => t.id === taskId);
        if (!taskToMove) return prev;

        const otherTasks = prev.filter((t) => t.id !== taskId);
        const finalDept = targetDepartment !== undefined ? targetDepartment : taskToMove.department;

        const columnTasks = otherTasks
          .filter(
            (t) =>
              t.status === targetStatus &&
              t.project_id === taskToMove.project_id &&
              (targetDepartment === undefined || t.department === finalDept)
          )
          .sort((a, b) => a.order_index - b.order_index);

        const insertIndex =
          typeof newIndex === "number" && newIndex >= 0
            ? Math.min(newIndex, columnTasks.length)
            : columnTasks.length;

        const updatedMovedTask = {
          ...taskToMove,
          status: targetStatus,
          department: finalDept,
          updated_at: new Date().toISOString(),
        };

        columnTasks.splice(insertIndex, 0, updatedMovedTask);

        const reindexedColumnTasks = columnTasks.map((t, idx) => ({
          ...t,
          order_index: idx,
        }));

        const nonColumnTasks = otherTasks.filter(
          (t) =>
            !(
              t.status === targetStatus &&
              t.project_id === taskToMove.project_id &&
              (targetDepartment === undefined || t.department === finalDept)
            )
        );

        const nextTasks = [...nonColumnTasks, ...reindexedColumnTasks];
        recalculateProjectProgress(taskToMove.project_id, nextTasks);

        if (editingTask && editingTask.id === taskId) {
          setEditingTask({ ...editingTask, status: targetStatus, department: finalDept });
        }

        taskService.moveTask(taskId, targetStatus, insertIndex, targetDepartment);
        broadcastSync({ tasks: nextTasks });
        return nextTasks;
      });

      logActivity(
        "task_moved",
        `Moved task to "${targetStatus}"${targetDepartment ? ` in ${targetDepartment}` : ""}`,
        undefined,
        taskId
      );
    },
    [currentUser.role, recalculateProjectProgress, editingTask, broadcastSync, logActivity]
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
      syncTaskToSupabase(duplicated);
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
      if (!hasPermission(currentUser.role, "task:delete")) {
        toast.error("Permission Denied", "Your role does not allow bulk deletion.");
        return;
      }
      setTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));
      logActivity("bulk_task_delete", `Deleted ${taskIds.length} tasks`);
      toast.delete("Tasks Deleted", `Deleted ${taskIds.length} tasks.`);
    },
    [currentUser.role, logActivity, toast]
  );

  // --- Subtasks ---
  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const newSubId = generateId();
      const newSub: Subtask = {
        id: newSubId,
        task_id: taskId,
        title,
        completed: false,
        order_index: 99,
      };
      updateTask(taskId, {
        subtasks: [...(tasks.find((t) => t.id === taskId)?.subtasks || []), newSub],
      });
      taskService.addSubtask(taskId, title);
    },
    [tasks, updateTask]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const targetSub = task.subtasks.find((s) => s.id === subtaskId);
      const nextCompleted = targetSub ? !targetSub.completed : true;
      const nextSubs = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: nextCompleted } : s));
      updateTask(taskId, { subtasks: nextSubs });
      taskService.toggleSubtask(subtaskId, nextCompleted);
    },
    [tasks, updateTask]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const nextSubs = task.subtasks.filter((s) => s.id !== subtaskId);
      updateTask(taskId, { subtasks: nextSubs });
      taskService.deleteSubtask(subtaskId);
    },
    [tasks, updateTask]
  );

  // --- Comments ---
  const addComment = useCallback(
    (taskId: string, content: string) => {
      const newCommentId = generateId();
      const newComment: Comment = {
        id: newCommentId,
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
      taskService.addComment(taskId, currentUser.id, content);
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

  // --- Notes with Supabase Sync ---
  const createNote = useCallback(
    (data: Partial<Note>): Note => {
      const newNoteId = generateId();
      const newNote: Note = {
        id: newNoteId,
        workspace_id: activeWorkspaceId,
        project_id: data.project_id || selectedProjectId || undefined,
        author_id: currentUser.id,
        author: currentUser,
        title: data.title || "Untitled Note",
        content: data.content || "",
        is_pinned: data.is_pinned ?? false,
        is_private: data.is_private ?? false,
        tags: data.tags || ["General"],
        color: data.color || "yellow",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      logActivity("note_created", `Created note "${newNote.title}"`);
      noteService.createNote(newNote);
      return newNote;
    },
    [activeWorkspaceId, selectedProjectId, currentUser, logActivity]
  );

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, ...updates, updated_at: new Date().toISOString() };
          noteService.updateNote(id, updates);
          return updated;
        }
        return n;
      })
    );
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      noteService.deleteNote(id);
      logActivity("note_deleted", `Deleted note`);
    },
    [logActivity]
  );

  const togglePinNote = useCallback((id: string) => {
    setNotes((prev) => prev.map((n) => {
      if (n.id === id) {
        const nextPinned = !n.is_pinned;
        noteService.updateNote(id, { is_pinned: nextPinned });
        return { ...n, is_pinned: nextPinned };
      }
      return n;
    }));
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

  // --- Announcements with RBAC & Supabase Sync ---
  const createAnnouncement = useCallback(
    (title: string, content: string, priority: "urgent" | "important" | "general", isPinned?: boolean) => {
      if (!hasPermission(currentUser.role, "announcement:create")) {
        toast.error("Permission Denied", "Only Admins, Owners, and Project Managers can post announcements.");
        return;
      }

      const newAnnId = generateId();
      const newAnn: Announcement = {
        id: newAnnId,
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
      workspaceService.createAnnouncement(newAnn);

      // Notify other users
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
    [currentUser.role, activeWorkspaceId, currentUser, logActivity, users]
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
  const addNotification = useCallback(
    async (notifData: {
      id?: string;
      user_id?: string;
      title: string;
      message: string;
      type?: NotificationType;
      link_url?: string;
    }) => {
      const notifId = notifData.id || generateId("notif");

      setNotifications((prev) => {
        // Prevent duplicate notification by id or title
        if (prev.some((n) => n.id === notifId)) return prev;
        const newNotif: Notification = {
          id: notifId,
          user_id: notifData.user_id || currentUser.id,
          workspace_id: activeWorkspaceId,
          title: notifData.title,
          message: notifData.message,
          type: notifData.type || "system",
          link_url: notifData.link_url || "/billing",
          is_read: false,
          created_at: new Date().toISOString(),
        };
        broadcastSync({ notifications: [newNotif, ...prev] });
        return [newNotif, ...prev];
      });

      if (isSupabaseConfigured && supabase) {
        try {
          const payloadType =
            ["billing", "invoice", "delayed_payment", "delayed_task", "team"].includes(notifData.type || "")
              ? notifData.type === "delayed_task"
                ? "deadline"
                : notifData.type === "team"
                ? "task_assigned"
                : "system"
              : notifData.type || "system";
          await supabase.from("notifications").insert({
            id: notifId.startsWith("notif_") ? undefined : notifId,
            user_id: notifData.user_id || currentUser.id,
            workspace_id: activeWorkspaceId,
            title: notifData.title,
            message: notifData.message,
            type: payloadType,
            link_url: notifData.link_url || "/billing",
            is_read: false,
          });
        } catch (err) {
          console.error("Failed to insert notification into Supabase:", err);
        }
      }
    },
    [currentUser.id, activeWorkspaceId, broadcastSync]
  );

  // Automated Detection Engine for:
  // 1. Delayed Tasks (Overdue tasks past deadline)
  // 2. Delayed Payments (Overdue project deliverables, unpaid cycles & milestones)
  useEffect(() => {
    if (!isInitialized) return;
    if (tasks.length === 0 && projects.length === 0) return;

    const newAlerts: Notification[] = [];
    const now = Date.now();

    // 1. Scan Delayed Tasks
    tasks.forEach((t) => {
      if (t.due_date && t.status !== "done" && t.status !== "completed" && isOverdue(t.due_date, t.status)) {
        const notifId = `notif_delayed_task_${t.id}`;
        const daysPast = Math.max(1, Math.floor((now - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)));
        newAlerts.push({
          id: notifId,
          user_id: currentUserId || currentUser.id,
          workspace_id: activeWorkspaceId,
          title: `Delayed Task: ${t.title}`,
          message: `Task is ${daysPast} day${daysPast > 1 ? "s" : ""} overdue past target due date (${formatShortDate(t.due_date)}). Priority: ${t.priority.toUpperCase()}.`,
          type: "delayed_task",
          link_url: `/tasks/${t.id}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 2. Scan Delayed Payments
    projects.forEach((p) => {
      const currency = p.currency || "$";

      // Fixed Price: Target date overdue without full settlement
      if (p.billing_type === "fixed" && p.payment_status !== "paid" && p.target_date) {
        const targetTime = new Date(p.target_date).getTime();
        if (targetTime < now) {
          const daysPast = Math.max(1, Math.floor((now - targetTime) / (1000 * 60 * 60 * 24)));
          const unpaid = Math.max(0, (p.fixed_price_amount || 0) - (p.paid_amount || 0));
          if (unpaid > 0) {
            newAlerts.push({
              id: `notif_delayed_pay_${p.id}_target`,
              user_id: currentUserId || currentUser.id,
              workspace_id: activeWorkspaceId,
              title: `Delayed Payment: ${p.name}`,
              message: `Payment of ${currency}${unpaid.toLocaleString()} is ${daysPast} day${daysPast > 1 ? "s" : ""} overdue past target delivery date (${formatShortDate(p.target_date)}).`,
              type: "delayed_payment",
              link_url: `/billing`,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      // Check overdue milestones in installments
      if (p.installments && p.installments.length > 0) {
        p.installments.forEach((inst) => {
          if (inst.status !== "paid" && inst.due_date) {
            const dueTime = new Date(inst.due_date).getTime();
            if (dueTime < now) {
              const daysPast = Math.max(1, Math.floor((now - dueTime) / (1000 * 60 * 60 * 24)));
              newAlerts.push({
                id: `notif_delayed_pay_${p.id}_${inst.id}`,
                user_id: currentUserId || currentUser.id,
                workspace_id: activeWorkspaceId,
                title: `Delayed Payment: ${p.name} (${inst.title})`,
                message: `${inst.title} milestone of ${currency}${Number(inst.amount).toLocaleString()} is ${daysPast} day${daysPast > 1 ? "s" : ""} overdue (was due on ${formatShortDate(inst.due_date)}).`,
                type: "delayed_payment",
                link_url: `/billing`,
                is_read: false,
                created_at: new Date().toISOString(),
              });
            }
          }
        });
      }

      // Check recurring payment cycle delays (weekly / 15_days / 30_days)
      const sched = p.payment_schedule;
      if (sched && p.payment_status !== "paid") {
        const cycleDays = sched === "weekly" ? 7 : sched === "15_days" ? 15 : sched === "30_days" ? 30 : p.payment_terms_days || 30;
        const refDateStr = p.last_payment_date || p.start_date || p.created_at;
        if (refDateStr) {
          const refTime = new Date(refDateStr).getTime();
          const daysElapsed = Math.floor((now - refTime) / (1000 * 60 * 60 * 24));
          if (daysElapsed > cycleDays) {
            const daysOver = daysElapsed - cycleDays;
            newAlerts.push({
              id: `notif_delayed_cycle_${p.id}`,
              user_id: currentUserId || currentUser.id,
              workspace_id: activeWorkspaceId,
              title: `Delayed Payment Cycle: ${p.name}`,
              message: `${sched === "weekly" ? "Weekly (Net 7)" : sched === "15_days" ? "15-Day (Net 15)" : "30-Day (Net 30)"} billing cycle is ${daysOver} day${daysOver > 1 ? "s" : ""} past due date.`,
              type: "delayed_payment",
              link_url: `/billing`,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    });

    if (newAlerts.length > 0) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const toAdd = newAlerts.filter((a) => !existingIds.has(a.id));
        if (toAdd.length === 0) return prev;
        return [...toAdd, ...prev];
      });
    }
  }, [isInitialized, tasks, projects, currentUserId, currentUser.id, activeWorkspaceId]);

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
      if (activeTimer) return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const project = projects.find((p) => p.id === task.project_id);
      if (!project) return;
      const timer: ActiveTimer = {
        taskId,
        projectId: project.id,
        projectName: project.name,
        taskTitle: task.title,
        summary: `Worked on ${task.title}`,
        startedAt: Date.now(),
        seconds: 0,
      };
      setActiveTimer(timer);
      localStorage.setItem(`vinzflow_active_timer_${activeWorkspaceId}`, JSON.stringify(timer));
      updateTask(taskId, { is_timer_running: true });
    },
    [activeTimer, tasks, projects, activeWorkspaceId, updateTask]
  );

  const startProjectTimer = useCallback((projectId: string, summary: string): boolean => {
    const project = visibleProjects.find((item) => item.id === projectId && item.workspace_id === activeWorkspaceId);
    if (activeTimer || !project || !summary.trim()) return false;
    const timer: ActiveTimer = {
      projectId: project.id,
      projectName: project.name,
      taskTitle: project.name,
      summary: summary.trim(),
      startedAt: Date.now(),
      seconds: 0,
    };
    setActiveTimer(timer);
    localStorage.setItem(`vinzflow_active_timer_${activeWorkspaceId}`, JSON.stringify(timer));
    return true;
  }, [activeTimer, visibleProjects, activeWorkspaceId]);

  const updateTimerSummary = useCallback((summary: string) => {
    if (!activeTimer || !summary.trim()) return;
    const updated = { ...activeTimer, summary };
    setActiveTimer(updated);
    localStorage.setItem(`vinzflow_active_timer_${activeWorkspaceId}`, JSON.stringify(updated));
  }, [activeTimer, activeWorkspaceId]);

  const stopTimer = useCallback((summary?: string) => {
    if (!activeTimer) return;
    const task = activeTimer.taskId ? tasks.find((t) => t.id === activeTimer.taskId) : undefined;
    const project = projects.find((p) => p.id === activeTimer.projectId);
    const durationSeconds = Math.max(1, Math.floor((Date.now() - activeTimer.startedAt) / 1000));
    const workSummary = summary?.trim() || activeTimer.summary || (task ? `Worked on ${task.title}` : "Project work");

    const newEntry: TimeEntry = {
      id: generateId("te"),
      task_id: activeTimer.taskId,
      task_title: task?.title,
      workspace_id: project?.workspace_id || activeWorkspaceId,
      project_id: activeTimer.projectId,
      project_name: activeTimer.projectName,
      user_id: currentUser.id,
      user: currentUser,
      description: workSummary,
      work_summary: workSummary,
      duration_seconds: durationSeconds,
      started_at: new Date(activeTimer.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    };

    setTimeEntries((prev) => [newEntry, ...prev]);
    void timeEntryService.createTimeEntry(newEntry).then((saved) => {
      if (!saved && isSupabaseConfigured) toast.warning("Session saved locally", "Check your Supabase sign-in and run the Timeclock SQL to enable database sync.");
    });

    if (task) {
      updateTask(task.id, {
        tracked_seconds: (task.tracked_seconds || 0) + durationSeconds,
        is_timer_running: false,
      });
    }

    setActiveTimer(null);
    localStorage.removeItem(`vinzflow_active_timer_${activeWorkspaceId}`);
    logActivity("time_tracked", `Tracked ${Math.round(durationSeconds / 60)}m on "${activeTimer.projectName}": ${workSummary}`, activeTimer.projectId);
  }, [activeTimer, tasks, projects, activeWorkspaceId, currentUser, updateTask, logActivity, toast]);

  const addManualTimeEntry = useCallback(
    (taskId: string, durationMinutes: number, description?: string, customDate?: string) => {
      const task = tasks.find((t) => t.id === taskId);
      const seconds = durationMinutes * 60;
      let startedAt: string;
      if (customDate) {
        const d = new Date(customDate.includes("T") ? customDate : `${customDate}T12:00:00`);
        startedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } else {
        startedAt = new Date().toISOString();
      }
      const newEntry: TimeEntry = {
        id: generateId("te"),
        task_id: taskId,
        task_title: task?.title,
        workspace_id: task?.workspace_id || activeWorkspaceId,
        project_id: task?.project_id,
        project_name: projects.find((p) => p.id === task?.project_id)?.name,
        user_id: currentUser.id,
        user: currentUser,
        description: description || "Manual time entry",
        work_summary: description || "Manual time entry",
        duration_seconds: seconds,
        started_at: startedAt,
        is_billable: true,
      };
      setTimeEntries((prev) => [newEntry, ...prev]);
      void timeEntryService.createTimeEntry(newEntry).then((saved) => {
        if (!saved && isSupabaseConfigured) toast.warning("Entry saved locally", "Check your Supabase sign-in and run the Timeclock SQL to enable database sync.");
      });
      if (task) {
        updateTask(taskId, {
          tracked_seconds: (task.tracked_seconds || 0) + seconds,
        });
      }
    },
    [tasks, projects, activeWorkspaceId, currentUser, updateTask, toast]
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

  const refreshTeamData = useCallback(async () => {
    let targetWsId = activeWorkspaceId || "b0000000-0000-0000-0000-000000000001";
    try {
      const [dbUsers, pending, invites] = await Promise.all([
        workspaceService.getUsers(),
        inviteService.getPendingApprovals(targetWsId),
        Promise.resolve(inviteService.getActiveInvites(targetWsId)),
      ]);

      if (dbUsers && dbUsers.length > 0) {
        const approved = dbUsers.filter((u) => u.approval_status !== "pending");
        setUsers(approved);
      }
      setPendingApprovals(pending || []);
      setActiveInvites(invites || []);
    } catch (e) {
      console.error("Failed to refresh team data:", e);
    }
  }, [activeWorkspaceId]);

  const createInviteLink = useCallback(
    async (email: string, role: Role = "member") => {
      const targetWsId = activeWorkspaceId || "b0000000-0000-0000-0000-000000000001";
      const res = await inviteService.createInvite(
        targetWsId,
        email,
        role,
        currentUser.id,
        currentUser.full_name
      );
      setActiveInvites((prev) => [res.invite, ...prev]);
      logActivity("invite_created", `Generated invitation link for ${email || "new teammate"}`);
      return res;
    },
    [activeWorkspaceId, currentUser, logActivity]
  );

  const approveMember = useCallback(
    async (applicant: User): Promise<boolean> => {
      const targetWsId = activeWorkspaceId || "b0000000-0000-0000-0000-000000000001";
      const success = await inviteService.approveUser(applicant, targetWsId);
      if (success) {
        const approved: User = {
          ...applicant,
          role: "member",
          status: "online",
          approval_status: "approved",
        };
        setUsers((prev) => [approved, ...prev.filter((u) => u.id !== applicant.id)]);
        setPendingApprovals((prev) =>
          prev.filter((u) => u.id !== applicant.id && u.email !== applicant.email)
        );
        logActivity(
          "member_approved",
          `Approved ${applicant.full_name} (@${applicant.username || applicant.email}) as Member`
        );
        addNotification({
          id: `notif_new_team_${applicant.id}`,
          title: `New Team Member Added: ${applicant.full_name}`,
          message: `${applicant.full_name} (@${applicant.username || applicant.email}) has been approved and joined the workspace.`,
          type: "team",
          link_url: "/team",
        });
        toast.success(
          "Member Approved!",
          `${applicant.full_name} is now an active Member with login access.`
        );
        return true;
      } else {
        toast.error("Approval Failed", "Could not approve member. Please try again.");
        return false;
      }
    },
    [activeWorkspaceId, logActivity, toast]
  );

  const rejectMember = useCallback(
    async (applicantId: string, email: string): Promise<boolean> => {
      const success = await inviteService.rejectUser(applicantId, email);
      if (success) {
        setPendingApprovals((prev) =>
          prev.filter((u) => u.id !== applicantId && u.email !== email)
        );
        logActivity("member_rejected", `Rejected registration request for ${email}`);
        toast.delete("Registration Dismissed", `Registration for ${email} was rejected.`);
        return true;
      }
      return false;
    },
    [logActivity, toast]
  );

  const revokeInvite = useCallback(
    (inviteId: string) => {
      inviteService.revokeInvite(inviteId);
      setActiveInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast.delete("Invite Revoked", "The invitation link has been cancelled.");
    },
    [toast]
  );

  const inviteMember = useCallback(
    (email: string, role: Role) => {
      createInviteLink(email, role);
    },
    [createInviteLink]
  );

  const updateMemberRole = useCallback(
    async (userId: string, role: Role) => {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      toast.success("Role Updated", `Role updated to ${role}`);
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from("profiles").update({ role }).eq("id", userId);
          await supabase
            .from("workspace_members")
            .update({ role })
            .eq("workspace_id", activeWorkspaceId)
            .eq("user_id", userId);
          logActivity("role_updated", `Updated member role to ${role}`);
        } catch (err) {
          console.error("Failed to update member role in Supabase:", err);
        }
      }
    },
    [activeWorkspaceId, logActivity, toast]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      const target = users.find((u) => u.id === userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.delete("Member Removed", `${target?.full_name || "Member"} removed from workspace`);
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from("workspace_members")
            .delete()
            .eq("workspace_id", activeWorkspaceId)
            .eq("user_id", userId);
        } catch {}
      }
      logActivity("member_removed", `Removed ${target?.full_name || userId} from workspace`);
    },
    [activeWorkspaceId, logActivity, toast, users]
  );

  // --- Clients & Files ---
  const createClient = useCallback(
    (clientData: Partial<Client>): Client => {
      const newClientId = generateId();
      const newClient: Client = {
        id: newClientId,
        workspace_id: activeWorkspaceId,
        name: clientData.name || "Untitled Client",
        company: clientData.company || "",
        email: clientData.email || "",
        avatar_url: clientData.avatar_url || undefined,
        status: clientData.status || "active",
        project_ids: clientData.project_ids || [],
        created_at: new Date().toISOString(),
      };
      setClients((prev) => [newClient, ...prev]);
      logActivity("client_created", `Added client "${newClient.name}"`);
      clientService.createClient(newClient);
      broadcastSync({ clients: [newClient, ...clients] });
      return newClient;
    },
    [activeWorkspaceId, logActivity, broadcastSync, clients]
  );

  const updateClient = useCallback(
    (id: string, updates: Partial<Client>) => {
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      clientService.updateClient(id, updates);
      logActivity("client_updated", `Updated client details`);
    },
    [logActivity]
  );

  const deleteClient = useCallback(
    (id: string) => {
      const target = clients.find((c) => c.id === id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      clientService.deleteClient(id);
      logActivity("client_deleted", `Removed client "${target?.name || id}"`);
    },
    [clients, logActivity]
  );

  const uploadFile = useCallback(
    (fileData: {
      name: string;
      size: number;
      type: string;
      url: string;
      project_id?: string;
      client_id?: string;
      task_id?: string;
    }): ProjectFile => {
      const newFileId = generateId();
      const newFile: ProjectFile = {
        id: newFileId,
        workspace_id: activeWorkspaceId,
        project_id: fileData.project_id || selectedProjectId || undefined,
        client_id: fileData.client_id || undefined,
        task_id: fileData.task_id || undefined,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
        url: fileData.url,
        uploaded_by: currentUser.id,
        uploader: currentUser,
        uploaded_at: new Date().toISOString(),
      };
      setFiles((prev) => [newFile, ...prev]);
      logActivity("file_uploaded", `Uploaded "${newFile.name}"`);
      fileService.uploadFile({
        ...newFile,
        workspace_id: activeWorkspaceId,
      });
      broadcastSync({ files: [newFile, ...files] });
      return newFile;
    },
    [activeWorkspaceId, selectedProjectId, currentUser, logActivity, broadcastSync, files]
  );

  const deleteFile = useCallback(
    (id: string) => {
      const target = files.find((f) => f.id === id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      fileService.deleteFile(id);
      logActivity("file_deleted", `Deleted file "${target?.name || id}"`);
    },
    [files, logActivity]
  );

  const updateWidgets = useCallback((newWidgets: DashboardWidgetConfig[]) => {
    setWidgets(newWidgets);
  }, []);

  const resetAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUsers((prev) => prev.filter((u) => u.email === "vinz@vinzmedia.com" || u.approval_status === "approved"));
    setTasks([]);
    setNotes([]);
    setAnnouncements([]);
    setActivityLogs([]);
    setSelectedProjectIdState(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        // Auth & RBAC
        isAuthenticated,
        currentUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        login,
        signup,
        logout,
        demoLogin,

        // Data
        users,
        workspaces,
        activeWorkspace,
        activeWorkspaceId,
        projects: visibleProjects,
        allProjects: projects,
        activeProject,
        selectedProjectId,
        columns,
        tasks: visibleTasks,
        notes,
        announcements,
        notifications,
        unreadNotificationCount,
        activityLogs,
        widgets,
        timeEntries,
        clients,
        files: visibleFiles,
        activeTimer,
        theme,
        onlineUsers,

        activeView,
        isViewLoading,
        isInitialized,
        projectSubTab,
        editingTask,
        searchQuery,
        isCommandPaletteOpen,
        isQuickNoteOpen,
        isCreateTaskModalOpen,
        isCreateProjectModalOpen,
        isProfileModalOpen,
        defaultNewTaskStatus,
        defaultNewTaskDueDate,

        setActiveView: handleSetActiveView,
        setSelectedProjectId,
        setProjectSubTab,
        setEditingTask,
        setSearchQuery,
        setIsCommandPaletteOpen,
        setIsQuickNoteOpen,
        setIsCreateTaskModalOpen: openCreateTaskModal,
        setIsCreateProjectModalOpen,
        setIsProfileModalOpen,
        updateUserProfile,
        toggleTheme,
        setCurrentUserId,

        setActiveWorkspaceId,
        createWorkspace,
        inviteMember,
        updateMemberRole,
        removeMember,

        pendingApprovals,
        activeInvites,
        createInviteLink,
        approveMember,
        rejectMember,
        revokeInvite,
        refreshTeamData,

        createProject,
        updateProject,
        deleteProject,
        archiveProject,
        duplicateProject,
        togglePaymentPaid,
        toggleInstallmentPaid,

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

        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearAllNotifications,

        startTimer,
        startProjectTimer,
        updateTimerSummary,
        stopTimer,
        addManualTimeEntry,

        createClient,
        updateClient,
        deleteClient,
        uploadFile,
        deleteFile,

        updateWidgets,
        resetAllData,
        toast,
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
