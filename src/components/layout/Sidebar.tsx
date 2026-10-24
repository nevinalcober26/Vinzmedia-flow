"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/context/StoreContext";
import { useConfirm } from "@/context/ToastContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { WorkspaceLogo } from "@/components/common/WorkspaceLogo";
import { EditProjectModal } from "@/components/modals/EditProjectModal";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar,
  FileText,
  Megaphone,
  Users,
  Activity,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Receipt,
  Clock,
  FolderArchive,
  Check,
  Shield,
  Briefcase,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  ChevronsUpDown,
  Layers,
} from "lucide-react";
import { ActiveView } from "@/types";

export function Sidebar() {
  const confirm = useConfirm();
  const {
    canAccessView,
    can,
    currentRole,
    activeView,
    setActiveView,
    activeWorkspace,
    workspaces,
    setActiveWorkspaceId,
    projects,
    activeProject,
    selectedProjectId,
    setSelectedProjectId,
    tasks,
    currentUser,
    files,
    activeTimer,
    setIsCreateProjectModalOpen,
    setIsProfileModalOpen,
    setIsCommandPaletteOpen,
    setIsCreateTaskModalOpen,
    deleteProject,
  } = useStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [activeProjectMenuId, setActiveProjectMenuId] = useState<string | null>(null);

  // Floating Tooltip state for collapsed rail mode
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    sublabel?: string;
    badge?: string | number | null;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(max-width: 767px)");
    setIsCollapsed(media.matches);
    const handleResize = (event: MediaQueryListEvent) => setIsCollapsed(event.matches);
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWorkspaceMenuOpen(false);
        setActiveProjectMenuId(null);
        setHoveredTooltip(null);
        if (media.matches) setIsCollapsed(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, [contenteditable=true]")) return;
        event.preventDefault();
        setIsCollapsed((previous) => !previous);
      }
    };
    media.addEventListener("change", handleResize);
    window.addEventListener("keydown", handleShortcut);
    return () => {
      media.removeEventListener("change", handleResize);
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  // Dismiss tooltip on window scroll or resize
  useEffect(() => {
    if (!hoveredTooltip) return;
    const dismissTooltip = () => setHoveredTooltip(null);
    window.addEventListener("scroll", dismissTooltip, true);
    window.addEventListener("resize", dismissTooltip);
    return () => {
      window.removeEventListener("scroll", dismissTooltip, true);
      window.removeEventListener("resize", dismissTooltip);
    };
  }, [hoveredTooltip]);

  const showTooltip = (
    e: React.MouseEvent<HTMLElement>,
    label: string,
    badge?: string | number | null,
    sublabel?: string
  ) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      label,
      badge,
      sublabel,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideTooltip = () => {
    setHoveredTooltip(null);
  };

  // Calculate my unfinished tasks count
  const myTasksCount = tasks.filter(
    (t) => (t.assignee_ids || []).includes(currentUser.id) && t.status !== "done"
  ).length;

  const handleNavClick = (view: ActiveView) => {
    setSelectedProjectId(null);
    setActiveView(view);
    if (window.matchMedia("(max-width: 767px)").matches) setIsCollapsed(true);
  };

  // Logically structured navigation sections
  const navSections = [
    {
      id: "workspace",
      title: "Workspace",
      items: [
        {
          id: "dashboard" as ActiveView,
          label: "Dashboard",
          icon: LayoutDashboard,
          badge: null,
          badgeType: "default",
        },
        {
          id: "my_tasks" as ActiveView,
          label: "My Tasks",
          icon: CheckSquare,
          badge: myTasksCount > 0 ? myTasksCount : null,
          badgeType: "primary",
        },
        {
          id: "calendar" as ActiveView,
          label: "Calendar",
          icon: Calendar,
          badge: null,
          badgeType: "default",
        },
      ],
    },
    {
      id: "execution",
      title: "Projects",
      isProjectsGroup: true,
      items: [
        {
          id: "projects" as ActiveView,
          label: "All Projects",
          icon: FolderKanban,
          badge: projects.length,
          badgeType: "default",
        },
      ],
    },
    {
      id: "finance_ops",
      title: "Business",
      items: [
        {
          id: "timelogs" as ActiveView,
          label: "Time tracking",
          icon: Clock,
          badge: activeTimer ? "LIVE" : null,
          badgeType: "live",
        },
        {
          id: "billing" as ActiveView,
          label: "Billing & Invoices",
          icon: Receipt,
          badge: null,
          badgeType: "default",
        },
        {
          id: "clients" as ActiveView,
          label: "Clients & Files",
          icon: FolderArchive,
          badge: files.length > 0 ? files.length : null,
          badgeType: "default",
        },
      ],
    },
    {
      id: "collaboration",
      title: "Collaboration",
      items: [
        {
          id: "team" as ActiveView,
          label: "Team & Roles",
          icon: Users,
          badge: null,
          badgeType: "default",
        },
        {
          id: "announcements" as ActiveView,
          label: "Announcements",
          icon: Megaphone,
          badge: null,
          badgeType: "default",
        },
        {
          id: "notes" as ActiveView,
          label: "Notes & docs",
          icon: FileText,
          badge: null,
          badgeType: "default",
        },
      ],
    },
    {
      id: "admin_insights",
      title: "Insights",
      items: [
        {
          id: "workload" as ActiveView,
          label: "Team Workload",
          icon: BarChart2,
          badge: null,
          badgeType: "default",
        },
        {
          id: "activity" as ActiveView,
          label: "Activity Log",
          icon: Activity,
          badge: null,
          badgeType: "default",
        },
      ],
    },
  ];

  return (
    <>
    {!isCollapsed && (
      <button
        aria-label="Close navigation"
        onClick={() => setIsCollapsed(true)}
        className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px] md:hidden"
      />
    )}
    <aside
      aria-label="Workspace navigation"
      className={`workspace-sidebar relative shrink-0 flex flex-col border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground transition-all duration-300 z-40 select-none shadow-xs ${
        isCollapsed ? "w-16" : "w-[264px]"
      }`}
    >
      <div className={`flex h-16 shrink-0 items-center border-b border-sidebar-border/70 ${isCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        {!isCollapsed && (
          <button onClick={() => handleNavClick("dashboard")} aria-label="VinzFlow home" className="flex items-center gap-2.5 rounded-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-sm"><Layers className="h-4 w-4" /></span>
            <span className="text-[17px] font-semibold tracking-[-0.04em]">VinzFlow<span className="text-primary">.</span></span>
          </button>
        )}
        {/* Toggle Collapse Button */}
        <button
          onClick={() => {
            hideTooltip();
            setIsWorkspaceMenuOpen(false);
            setActiveProjectMenuId(null);
            setIsCollapsed(!isCollapsed);
          }}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
          onMouseEnter={(e) =>
            showTooltip(e, isCollapsed ? "Expand Sidebar" : "Collapse Sidebar", undefined, "Toggle Sidebar (⌘B)")
          }
          onMouseLeave={hideTooltip}
          className="text-muted-foreground hover:text-sidebar-foreground p-1.5 rounded-lg hover:bg-sidebar-accent/70 transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>
      {/* Workspace switcher */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2 shrink-0">
        {!isCollapsed ? (
          <div className="relative flex-1 min-w-0">
            <button
              aria-label="Switch workspace"
              aria-expanded={isWorkspaceMenuOpen}
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="flex items-center space-x-2.5 w-full text-left p-2.5 rounded-xl hover:bg-sidebar-accent/60 transition-all border border-sidebar-border/70 bg-card group cursor-pointer shadow-sm"
            >
              <WorkspaceLogo
                name={activeWorkspace.name}
                logoUrl={activeWorkspace.logo_url}
                className="w-8 h-8 group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col items-start gap-1">
                  <p className="text-xs font-bold truncate text-sidebar-foreground tracking-tight">
                    {activeWorkspace.name}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {activeWorkspace.tagline || "Workspace"}
                </p>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Workspace Switcher dropdown */}
            {isWorkspaceMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                />
                <div
                  className="absolute left-0 top-12 w-64 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl py-2 z-50 text-xs overflow-hidden animate-in fade-in zoom-in-95"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                >
                  <div className="px-3.5 py-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 flex items-center justify-between">
                    <span>Workspaces</span>
                    <span className="text-[9px] font-mono text-muted-foreground/90">
                      {workspaces.length} active
                    </span>
                  </div>
                  <div className="p-1 space-y-0.5 max-h-56 overflow-y-auto">
                    {workspaces.map((ws) => {
                      const isCurrent = ws.id === activeWorkspace.id;
                      return (
                        <button
                          key={ws.id}
                          onClick={() => setActiveWorkspaceId(ws.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-secondary text-foreground font-semibold"
                              : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <WorkspaceLogo
                              name={ws.name}
                              logoUrl={ws.logo_url}
                              className="w-6 h-6 rounded-lg"
                              textClassName="text-[9px]"
                            />
                            <span className="truncate text-xs">{ws.name}</span>
                          </div>
                          {isCurrent && (
                            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setIsCollapsed(false); setIsWorkspaceMenuOpen(true); }}
            aria-label="Switch workspace"
            className="mx-auto cursor-pointer"
            title={activeWorkspace.name}
            onMouseEnter={(e) =>
              showTooltip(e, activeWorkspace.name, undefined, "Active Workspace")
            }
            onMouseLeave={hideTooltip}
          >
            <WorkspaceLogo
              name={activeWorkspace.name}
              logoUrl={activeWorkspace.logo_url}
              className="w-8 h-8"
            />
          </button>
        )}


      </div>

      <div className={`shrink-0 space-y-2 pb-2 pt-2 ${isCollapsed ? "px-3" : "px-4"}`}>
        <button onClick={() => setIsCommandPaletteOpen(true)} aria-label="Search workspace" title="Search workspace (⌘K)" className={`flex h-9 w-full items-center rounded-lg border border-sidebar-border/70 text-muted-foreground transition-colors hover:bg-sidebar-accent ${isCollapsed ? "justify-center" : "gap-2 px-2.5"}`}>
          <Search className="h-4 w-4 shrink-0" />
          {!isCollapsed && <><span className="flex-1 text-left text-xs">Search anything…</span><kbd className="rounded border border-sidebar-border px-1 text-[10px]">⌘K</kbd></>}
        </button>
        <button disabled={!can("task:create")} style={!can("task:create") ? { display: "none" } : undefined} onClick={() => setIsCreateTaskModalOpen(true)} aria-label="Create task" title="Create task" className={`flex h-9 w-full items-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 ${isCollapsed ? "justify-center" : "gap-2 px-2.5"}`}>
          <Plus className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-xs font-medium">Create task</span>}
        </button>
      </div>
      {/* Main Navigation Scroll Area */}
      <div
        onScroll={hideTooltip}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-3"
      >
        {navSections.map((section) => ({ ...section, items: section.items.filter((item) => canAccessView(item.id)) })).filter((section) => section.items.length > 0).map((section) => (
          <div key={section.id} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pt-2 pb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">
                <span>{section.title}</span>
                {section.isProjectsGroup && can("project:create") && (
                  <button
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    title="Create new project"
                    className="p-0.5 text-muted-foreground hover:text-primary hover:bg-sidebar-accent rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="h-px w-full bg-sidebar-border/50 my-2" />
            )}

            <nav aria-label={section.title} className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id && !selectedProjectId;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      hideTooltip();
                      handleNavClick(item.id);
                    }}
                    title={isCollapsed ? `${item.label} • ${section.title}` : undefined}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    onMouseEnter={(e) => showTooltip(e, item.label, item.badge, section.title)}
                    onMouseLeave={hideTooltip}
                    className={`w-full relative flex items-center ${
                      isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                    } min-h-9 py-2 text-[13px] rounded-lg font-medium transition-all group cursor-pointer ${
                      isActive
                        ? "sidebar-nav-active font-semibold"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon
                        className={`w-[17px] h-[17px] stroke-[1.7] flex-shrink-0 transition-colors ${
                          isActive
                            ? "text-primary stroke-[2.2]"
                            : "text-muted-foreground group-hover:text-sidebar-foreground"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate tracking-tight">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge !== null && (
                      <div>
                        {item.badgeType === "live" ? (
                          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>LIVE</span>
                          </span>
                        ) : item.badgeType === "primary" ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                            {item.badge}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary text-muted-foreground font-mono font-medium">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Expandable Project List for Projects & Work */}
            {section.isProjectsGroup && (
              <div className="pt-0.5 space-y-0.5">
                {!isCollapsed && (
                  <button
                    aria-expanded={isProjectsExpanded}
                    onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent/40 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      {isProjectsExpanded ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span>Project shortcuts</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      {projects.length}
                    </span>
                  </button>
                )}

                {(isProjectsExpanded || isCollapsed) && (
                  <div className="space-y-0.5 pl-1">
                    {projects.slice(0, 8).map((proj) => {
                      const isSelected = selectedProjectId === proj.id;
                      const isMenuOpen = activeProjectMenuId === proj.id;
                      return (
                        <div
                          key={proj.id}
                          className="relative group/proj flex items-center w-full"
                        >
                          <button
                            onClick={() => {
                              hideTooltip();
                              setSelectedProjectId(proj.id);
                              setActiveView("project_detail");
                              if (window.matchMedia("(max-width: 767px)").matches) setIsCollapsed(true);
                            }}
                            title={
                              isCollapsed
                                ? `${proj.name} (${proj.progress > 0 ? `${proj.progress}%` : "0%"}) • Active Workstream`
                                : undefined
                            }
                            aria-label={proj.name}
                            aria-current={isSelected ? "page" : undefined}
                            onMouseEnter={(e) =>
                              showTooltip(
                                e,
                                proj.name,
                                proj.progress > 0 ? `${proj.progress}%` : undefined,
                                "Active Workstream"
                              )
                            }
                            onMouseLeave={hideTooltip}
                            className={`w-full flex items-center ${
                              isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                            } py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                              isSelected
                                ? "sidebar-nav-active font-semibold"
                                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            }`}
                          >
                            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? "" : "pr-6"}`}>
                              <span
                                className={isCollapsed ? "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold" : "h-2 w-2 rounded-full shrink-0"}
                                style={{ backgroundColor: isCollapsed ? `${proj.color}20` : proj.color, color: proj.color }}
                              >{isCollapsed ? proj.name.slice(0, 2).toUpperCase() : null}</span>
                              {!isCollapsed && (
                                <span className="truncate tracking-tight text-xs">
                                  {proj.name}
                                </span>
                              )}
                            </div>
                            {!isCollapsed && proj.progress > 0 && !isMenuOpen && (
                              <span className="text-[10px] text-muted-foreground/80 font-mono group-hover/proj:opacity-0 transition-opacity">
                                {proj.progress}%
                              </span>
                            )}
                          </button>

                          {/* 3 Dots Actions Button */}
                          {!isCollapsed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveProjectMenuId(isMenuOpen ? null : proj.id);
                              }}
                              className={`absolute right-1.5 p-1 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all cursor-pointer ${
                                isMenuOpen ? "opacity-100 bg-sidebar-accent text-sidebar-foreground" : "opacity-0 group-hover/proj:opacity-100"
                              }`}
                              title={`Options for ${proj.name}`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 3 Dots Dropdown Action Menu */}
                          {!isCollapsed && isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveProjectMenuId(null);
                                }}
                              />
                              <div
                                className="absolute right-1 top-8 w-44 rounded-xl bg-card border border-border shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-border/40 text-card-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-1 space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveProjectMenuId(null);
                                      setEditingProject(proj);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-secondary rounded-lg flex items-center space-x-2 text-foreground font-medium transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-primary" />
                                    <span>Edit Project</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveProjectMenuId(null);
                                      setSelectedProjectId(proj.id);
                                      setActiveView("billing");
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-secondary rounded-lg flex items-center space-x-2 text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Billing & Invoices</span>
                                  </button>
                                </div>
                                <div className="p-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveProjectMenuId(null);
                                      confirm({
                                        title: `Delete "${proj.name}"?`,
                                        message: `Are you sure you want to delete "${proj.name}" and all associated tasks? This action cannot be undone.`,
                                        confirmText: "Delete Project",
                                        variant: "danger",
                                        onConfirm: () => {
                                          deleteProject(proj.id);
                                        },
                                      });
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-rose-500/10 rounded-lg flex items-center space-x-2 text-rose-500 font-medium transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Project</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {!isCollapsed && projects.length === 0 && (
                      <p className="px-3 py-1 text-[10px] text-muted-foreground/70 italic">
                        No projects created yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer / User Profile & Settings */}
      <div className="border-t border-sidebar-border/70 p-3 space-y-2 shrink-0">
        <button
          onClick={() => {
            hideTooltip();
            setIsProfileModalOpen(true);
          }}
          title={isCollapsed ? `${currentUser.full_name} (${currentRole.name})` : undefined}
          aria-label={currentUser.full_name}
          onMouseEnter={(e) =>
            showTooltip(
              e,
              currentUser.full_name,
              undefined,
              `Signed in as ${currentRole.name}`
            )
          }
          onMouseLeave={hideTooltip}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center px-0" : "space-x-2.5 px-2"
          } py-1.5 text-xs rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/70 transition-all cursor-pointer group border border-transparent hover:border-sidebar-border/40`}
        >
          <UserAvatar user={currentUser} size="xs" showStatus />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center space-x-1.5">
                <p className="font-bold text-xs truncate group-hover:text-primary transition-colors tracking-tight">
                  {currentUser.full_name}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground truncate capitalize">
                {currentRole.name}
              </p>
            </div>
          )}
        </button>

        <button
          onClick={() => {
            hideTooltip();
            handleNavClick("settings");
          }}
          title={isCollapsed ? "Workspace Settings • Insights & Admin" : undefined}
          style={!canAccessView("settings") ? { display: "none" } : undefined}
          aria-label="Workspace Settings"
          onMouseEnter={(e) =>
            showTooltip(e, "Workspace Settings", undefined, "Insights & Admin")
          }
          onMouseLeave={hideTooltip}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center px-0" : "space-x-2.5 px-2.5"
          } py-1.5 text-xs rounded-xl text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Settings & preferences</span>}
        </button>
      </div>

      {/* Floating Tooltip Pill for Collapsed Navigation (Rendered in document.body via Portal) */}
      {mounted &&
        isCollapsed &&
        hoveredTooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              top: `${hoveredTooltip.top}px`,
              left: `${hoveredTooltip.left}px`,
              transform: "translateY(-50%)",
            }}
            className="fixed z-[99999] pointer-events-none flex items-center px-3 py-1.5 rounded-xl bg-popover text-popover-foreground border border-border/90 shadow-2xl text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
          >
            {/* Triangular Caret pointing directly to icon */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-popover" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-foreground text-xs">
                  {hoveredTooltip.label}
                </span>
                {hoveredTooltip.badge !== undefined && hoveredTooltip.badge !== null && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25">
                    {hoveredTooltip.badge}
                  </span>
                )}
              </div>
              {hoveredTooltip.sublabel && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  {hoveredTooltip.sublabel}
                </span>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          project={projects.find((p) => p.id === editingProject.id) || editingProject}
        />
      )}
    </aside>
    </>
  );
}
