"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  Play,
  Square,
  StickyNote,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  Clock,
  Sparkles,
  Command as CommandIcon,
  HelpCircle,
  LogOut,
  LogIn,
  UserCheck,
  Shield,
  AlertTriangle,
  Database,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FileText,
  Megaphone,
  Users,
  Activity,
  BarChart2,
  Settings,
  FolderArchive,
  Receipt,
  User,
  Download,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { formatTimerDisplay, getPriorityBadgeColor } from "@/lib/utils";
import { getRoleBadge } from "@/lib/permissions";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { KeyboardShortcutsModal } from "@/components/modals/KeyboardShortcutsModal";
import { UserAvatar } from "@/components/common/UserAvatar";

export function Navbar() {
  const {
    currentUser,
    users,
    setCurrentUserId,
    activeWorkspace,
    activeProject,
    activeView,
    theme,
    toggleTheme,
    setIsCommandPaletteOpen,
    setIsQuickNoteOpen,
    setIsCreateTaskModalOpen,
    unreadNotificationCount,
    activeTimer,
    stopTimer,
    setActiveView,
    isAuthenticated,
    logout,
    setIsProfileModalOpen,
  } = useStore();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu with smooth exit when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Keyboard shortcut listener for Cmd+K and ?
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsCommandPaletteOpen]);

  // Format breadcrumbs with view icons
  const getBreadcrumb = () => {
    if (activeView === "project_detail" && activeProject) {
      return (
        <div className="flex items-center space-x-2 text-xs md:text-sm text-muted-foreground select-none">
          <button
            onClick={() => setActiveView("projects")}
            className="flex items-center space-x-1.5 hover:text-foreground transition-colors cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">Projects</span>
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          <span className="font-semibold text-foreground flex items-center space-x-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block ring-2 ring-background shadow-2xs"
              style={{ backgroundColor: activeProject.color }}
            />
            <span className="truncate max-w-[180px] sm:max-w-none">{activeProject.name}</span>
          </span>
        </div>
      );
    }

    const viewMeta: Record<string, { label: string; icon: React.ElementType }> = {
      dashboard: { label: "Dashboard", icon: LayoutDashboard },
      my_tasks: { label: "My Tasks", icon: CheckSquare },
      projects: { label: "All Projects", icon: FolderKanban },
      clients: { label: "Clients & Files", icon: FolderArchive },
      billing: { label: "Billing & Invoices", icon: Receipt },
      timelogs: { label: "Time Logs & Timesheet", icon: Clock },
      calendar: { label: "Master Calendar", icon: Calendar },
      notes: { label: "Quick Notes & Docs", icon: FileText },
      announcements: { label: "Announcements", icon: Megaphone },
      team: { label: "Team & Roles", icon: Users },
      activity: { label: "Activity Log", icon: Activity },
      workload: { label: "Team Workload", icon: BarChart2 },
      settings: { label: "Workspace Settings", icon: Settings },
    };

    const currentMeta = viewMeta[activeView] || { label: "Dashboard", icon: LayoutDashboard };
    const CurrentIcon = currentMeta.icon;

    return (
      <div className="flex items-center space-x-2 min-w-0 flex-1 text-xs md:text-sm select-none">
        <span className="text-muted-foreground/80 font-medium hidden sm:inline">
          {activeWorkspace.name}
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/40 hidden sm:inline" />
        <div className="flex min-w-0 items-center space-x-1.5 text-foreground font-semibold">
          <CurrentIcon className="w-4 h-4 text-primary" />
          <span className="truncate tracking-tight">{currentMeta.label}</span>
        </div>
      </div>
    );
  };

  const roleBadge = getRoleBadge(currentUser.role);

  return (
    <>
      <header className="workspace-navbar sticky top-0 z-30 flex h-16 shrink-0 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 md:px-6 backdrop-blur-xl transition-colors">
        {/* Left: Breadcrumbs & Quick Nav */}
        <div className="flex items-center space-x-3 min-w-0 overflow-hidden">{getBreadcrumb()}</div>

        {/* Center: Global Search trigger (Linear style) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center justify-between w-full h-9 px-3 text-xs text-muted-foreground bg-secondary/40 hover:bg-secondary/70 border border-border/60 hover:border-primary/40 rounded-xl transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center space-x-2 truncate">
              <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              <span className="truncate">Search your workspace…</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground/80 bg-background/80 border border-border/80 rounded-md shadow-2xs">
              <CommandIcon className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          aria-label="Search workspace"
          className="ml-auto mr-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary md:hidden"
        >
          <Search className="h-4 w-4" />
        </button>
        {/* Right Actions */}
        <div className="flex shrink-0 items-center space-x-0.5 sm:space-x-2">
          {/* Missing Vercel Env Warning Badge */}
          {!isSupabaseConfigured && (
            <button
              onClick={() => setActiveView("settings")}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all shadow-xs cursor-pointer animate-pulse"
              title="Supabase Environment Variables missing on Vercel. Click for setup instructions."
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Database Disconnected</span>
              <span className="sm:hidden">DB Offline</span>
            </button>
          )}

          {/* Active Timer Pill if running */}
          {activeTimer && (
            <div className="flex items-center space-x-2 px-3 py-1 text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full animate-pulse shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="font-bold">{formatTimerDisplay(activeTimer.seconds)}</span>
              <button
                onClick={stopTimer}
                title="Stop active timer"
                className="hover:bg-emerald-500/20 rounded p-0.5 transition-colors cursor-pointer"
              >
                <Square className="w-3 h-3 fill-emerald-500 text-emerald-500" />
              </button>
            </div>
          )}

          {/* Quick Note Floating Button */}
          <button
            onClick={() => setIsQuickNoteOpen(true)}
            title="Open Quick Notes Scratchpad"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-xl transition-colors cursor-pointer"
          >
            <StickyNote className="w-4 h-4" />
          </button>

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-xl transition-colors cursor-pointer hidden sm:flex"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-xl transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Notifications Popover trigger */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title="Notifications"
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-xl transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
            {isNotifOpen && <NotificationsPopover onClose={() => setIsNotifOpen(false)} />}
          </div>

          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* User Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center space-x-2 p-1 hover:bg-secondary/70 rounded-xl transition-all cursor-pointer focus:outline-none"
            >
              <UserAvatar user={currentUser} size="sm" showStatus />

              {/* Role badge pill */}
              <span
                className={`hidden xl:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge.className}`}
              >
                {roleBadge.label}
              </span>
            </button>

            {/* Profile Menu Dropdown with Premium Spring Animation */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -8 }}
                  transition={{
                    type: "spring",
                    stiffness: 450,
                    damping: 28,
                    mass: 0.7,
                  }}
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl py-2 z-50 text-xs overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border/60 flex items-center space-x-3">
                    <UserAvatar user={currentUser} size="md" showStatus />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-xs truncate">
                        {currentUser.full_name}
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {currentUser.email}
                      </p>
                      {currentUser.username && (
                        <p className="text-primary text-[10px] font-mono">
                          @{currentUser.username}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-foreground font-semibold hover:bg-secondary rounded-xl transition-colors flex items-center space-x-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>Edit Profile & Avatar</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setActiveView("team");
                      }}
                      className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer flex items-center space-x-2"
                    >
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Team & Roles</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setActiveView("settings");
                      }}
                      className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer flex items-center space-x-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Workspace Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
                        }
                      }}
                      className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer flex items-center space-x-2"
                    >
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span>Install VinzFlow App</span>
                    </button>
                    <div className="h-px bg-border/40 my-1" />
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center space-x-2 cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Shortcuts Modal */}
      {isShortcutsOpen && <KeyboardShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}
    </>
  );
}
