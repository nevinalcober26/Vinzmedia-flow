"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/context/StoreContext";
import { UserAvatar } from "@/components/common/UserAvatar";
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
} from "lucide-react";
import { ActiveView } from "@/types";

export function Sidebar() {
  const {
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
  } = useStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);

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
          label: "Master Calendar",
          icon: Calendar,
          badge: null,
          badgeType: "default",
        },
      ],
    },
    {
      id: "execution",
      title: "Projects & Work",
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
      title: "Operations & Finance",
      items: [
        {
          id: "timelogs" as ActiveView,
          label: "Time Logs & Timesheet",
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
          label: "Quick Notes & Docs",
          icon: FileText,
          badge: null,
          badgeType: "default",
        },
      ],
    },
    {
      id: "admin_insights",
      title: "Insights & Admin",
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
        {
          id: "settings" as ActiveView,
          label: "Workspace Settings",
          icon: Settings,
          badge: null,
          badgeType: "default",
        },
      ],
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground transition-all duration-300 z-40 select-none shadow-xs ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Premium Workspace Header Switcher */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border/60 px-3 shrink-0">
        {!isCollapsed ? (
          <div className="relative flex-1 min-w-0 pr-1">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="flex items-center space-x-2.5 w-full text-left p-1.5 rounded-xl hover:bg-sidebar-accent/60 transition-all border border-transparent hover:border-sidebar-border/50 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                {activeWorkspace.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <p className="text-xs font-bold truncate text-sidebar-foreground tracking-tight">
                    {activeWorkspace.name}
                  </p>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                    {activeWorkspace.plan || "PRO"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  Enterprise Workspace
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors flex-shrink-0" />
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
                    <span className="text-[9px] font-mono text-muted-foreground/60">
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
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs flex-shrink-0">
                              {ws.name.charAt(0)}
                            </div>
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
          <div
            className="mx-auto cursor-pointer"
            title={activeWorkspace.name}
            onMouseEnter={(e) =>
              showTooltip(e, activeWorkspace.name, activeWorkspace.plan?.toUpperCase() || "PRO", "Active Workspace")
            }
            onMouseLeave={hideTooltip}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-500/20">
              {activeWorkspace.name.charAt(0)}
            </div>
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={() => {
            hideTooltip();
            setIsCollapsed(!isCollapsed);
          }}
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

      {/* Main Navigation Scroll Area */}
      <div
        onScroll={hideTooltip}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-4"
      >
        {navSections.map((section) => (
          <div key={section.id} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2 pt-2 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                <span>{section.title}</span>
                {section.isProjectsGroup && (
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

            <nav className="space-y-0.5">
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
                    onMouseEnter={(e) => showTooltip(e, item.label, item.badge, section.title)}
                    onMouseLeave={hideTooltip}
                    className={`w-full relative flex items-center ${
                      isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                    } py-1.5 text-xs rounded-xl font-medium transition-all group cursor-pointer ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold shadow-2xs border-l-2 border-primary"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
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
                    onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent/40 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      {isProjectsExpanded ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span>Active Workstreams</span>
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
                      return (
                        <button
                          key={proj.id}
                          onClick={() => {
                            hideTooltip();
                            setSelectedProjectId(proj.id);
                            setActiveView("project_detail");
                          }}
                          title={
                            isCollapsed
                              ? `${proj.name} (${proj.progress > 0 ? `${proj.progress}%` : "0%"}) • Active Workstream`
                              : undefined
                          }
                          aria-label={proj.name}
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
                              ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-background shadow-2xs"
                              style={{ backgroundColor: proj.color }}
                            />
                            {!isCollapsed && (
                              <span className="truncate tracking-tight text-[11px]">
                                {proj.name}
                              </span>
                            )}
                          </div>
                          {!isCollapsed && proj.progress > 0 && (
                            <span className="text-[10px] text-muted-foreground/80 font-mono">
                              {proj.progress}%
                            </span>
                          )}
                        </button>
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
      <div className="border-t border-sidebar-border/60 p-2.5 space-y-1 bg-sidebar/50 shrink-0">
        <button
          onClick={() => {
            hideTooltip();
            setIsProfileModalOpen(true);
          }}
          title={isCollapsed ? `${currentUser.full_name} (${currentUser.role.replace("_", " ")})` : undefined}
          aria-label={currentUser.full_name}
          onMouseEnter={(e) =>
            showTooltip(
              e,
              currentUser.full_name,
              undefined,
              `Signed in as ${currentUser.role.replace("_", " ")}`
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
                {currentUser.role.replace("_", " ")}
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
          {!isCollapsed && <span className="font-medium">Settings & Preferences</span>}
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
    </aside>
  );
}
