"use client";

import React, { useState } from "react";
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
  Layers,
  Archive,
  Compass,
  FolderArchive,
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
    unreadNotificationCount,
    setIsCreateProjectModalOpen,
    setIsProfileModalOpen,
  } = useStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  // Calculate my tasks count
  const myTasksCount = tasks.filter(
    (t) => t.assignee_ids.includes(currentUser.id) && t.status !== "done"
  ).length;

  const handleNavClick = (view: ActiveView) => {
    setSelectedProjectId(null);
    setActiveView(view);
  };

  const navItems = [
    {
      id: "dashboard" as ActiveView,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "my_tasks" as ActiveView,
      label: "My Tasks",
      icon: CheckSquare,
      badge: myTasksCount > 0 ? myTasksCount : null,
    },
    {
      id: "projects" as ActiveView,
      label: "Projects",
      icon: FolderKanban,
      badge: projects.length,
    },
    {
      id: "clients" as ActiveView,
      label: "Clients & Files",
      icon: FolderArchive,
      badge: files.length > 0 ? files.length : null,
    },
    {
      id: "calendar" as ActiveView,
      label: "Calendar",
      icon: Calendar,
      badge: null,
    },
  ];

  const collabItems = [
    {
      id: "notes" as ActiveView,
      label: "Quick Notes",
      icon: FileText,
      badge: null,
    },
    {
      id: "announcements" as ActiveView,
      label: "Announcements",
      icon: Megaphone,
      badge: null,
    },
    {
      id: "team" as ActiveView,
      label: "Team Members",
      icon: Users,
      badge: null,
    },
    {
      id: "activity" as ActiveView,
      label: "Activity Feed",
      icon: Activity,
      badge: null,
    },
    {
      id: "workload" as ActiveView,
      label: "Team Workload",
      icon: BarChart2,
      badge: null,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 z-40 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Workspace Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {!isCollapsed ? (
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="flex items-center space-x-2.5 w-full text-left p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                {activeWorkspace.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-sidebar-foreground">
                  {activeWorkspace.name}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {activeWorkspace.plan} Plan
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Workspace Switcher dropdown */}
            {isWorkspaceMenuOpen && (
              <div
                className="absolute left-0 top-12 w-56 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
                onClick={() => setIsWorkspaceMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => setActiveWorkspaceId(ws.id)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-secondary transition-colors ${
                      ws.id === activeWorkspace.id ? "bg-secondary font-medium" : ""
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                      {ws.name.charAt(0)}
                    </div>
                    <span className="truncate flex-1">{ws.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {activeWorkspace.name.charAt(0)}
            </div>
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-sidebar-foreground p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-5">
        {/* Workspace Nav Section */}
        <div>
          {!isCollapsed && (
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Workspace
            </p>
          )}
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id && !selectedProjectId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                  } py-1.5 text-xs rounded-lg font-medium transition-all ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== null && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary text-muted-foreground font-medium">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Projects Section with Accordion */}
        <div>
          <div className="flex items-center justify-between px-2 pb-1.5">
            {!isCollapsed ? (
              <>
                <button
                  onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                  className="flex items-center space-x-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 hover:text-sidebar-foreground transition-colors"
                >
                  {isProjectsExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Projects</span>
                </button>
                <button
                  onClick={() => setIsCreateProjectModalOpen(true)}
                  title="Create new project"
                  className="p-0.5 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="h-px w-full bg-sidebar-border my-1" />
            )}
          </div>

          {(isProjectsExpanded || isCollapsed) && (
            <div className="space-y-0.5">
              {projects.map((proj) => {
                const isSelected = selectedProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      setActiveView("project_detail");
                    }}
                    title={proj.name}
                    className={`w-full flex items-center ${
                      isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                    } py-1.5 text-xs rounded-lg transition-all ${
                      isSelected
                        ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: proj.color }}
                      />
                      {!isCollapsed && <span className="truncate">{proj.name}</span>}
                    </div>
                    {!isCollapsed && proj.progress > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {proj.progress}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Collaboration Nav Section */}
        <div>
          {!isCollapsed && (
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Collaboration
            </p>
          )}
          <nav className="space-y-0.5">
            {collabItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                  } py-1.5 text-xs rounded-lg font-medium transition-all ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / User Profile & Settings */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <button
          onClick={() => setIsProfileModalOpen(true)}
          title="Edit Profile & Avatar"
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center px-0" : "space-x-2.5 px-2"
          } py-1.5 text-xs rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer group`}
        >
          <UserAvatar user={currentUser} size="xs" showStatus />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold text-xs truncate group-hover:text-primary transition-colors">
                {currentUser.full_name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">
                {currentUser.role.replace("_", " ")}
              </p>
            </div>
          )}
        </button>

        <button
          onClick={() => handleNavClick("settings")}
          title="Workspace Settings"
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center px-0" : "space-x-2.5 px-2.5"
          } py-1.5 text-xs rounded-xl text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </button>
      </div>
    </aside>
  );
}
