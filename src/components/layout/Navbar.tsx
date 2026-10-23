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
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { formatTimerDisplay, getPriorityBadgeColor } from "@/lib/utils";
import { getRoleBadge } from "@/lib/permissions";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { KeyboardShortcutsModal } from "@/components/modals/KeyboardShortcutsModal";
import { UserAvatar } from "@/components/common/UserAvatar";
import { User } from "lucide-react";

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

  // Format breadcrumbs based on view and project
  const getBreadcrumb = () => {
    if (activeView === "project_detail" && activeProject) {
      return (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span
            className="hover:text-foreground cursor-pointer transition-colors"
            onClick={() => setActiveView("projects")}
          >
            Projects
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="font-semibold text-foreground flex items-center space-x-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: activeProject.color }}
            />
            <span>{activeProject.name}</span>
          </span>
        </div>
      );
    }
    const viewTitles: Record<string, string> = {
      dashboard: "Main Dashboard",
      my_tasks: "My Tasks",
      projects: "All Projects",
      clients: "Clients & Files",
      billing: "Billing & Invoices",
      timelogs: "Time Logs & Labor Tracking",
      calendar: "Master Calendar",
      notes: "Quick Notes & Docs",
      announcements: "Team Announcements",
      team: "Team & Roles",
      activity: "Workspace Activity",
      workload: "Team Workload",
      settings: "Workspace Settings",
    };
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-muted-foreground font-medium">{activeWorkspace.name}</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">{viewTitles[activeView] || "Dashboard"}</span>
      </div>
    );
  };

  const roleBadge = getRoleBadge(currentUser.role);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/80 px-4 md:px-6 backdrop-blur-md transition-colors">
        {/* Left: Breadcrumbs & Quick Nav */}
        <div className="flex items-center space-x-3">{getBreadcrumb()}</div>

        {/* Center: Global Search trigger (Linear style) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center justify-between w-full h-8 px-3 text-xs text-muted-foreground bg-secondary/50 hover:bg-secondary border border-border/60 hover:border-border rounded-lg transition-all shadow-sm group"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span>Search projects, tasks, notes, team...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 bg-background border border-border/80 rounded shadow-xs">
              <CommandIcon className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Missing Vercel Env Warning Badge */}
          {!isSupabaseConfigured && (
            <button
              onClick={() => setActiveView("settings")}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-all shadow-xs cursor-pointer animate-pulse"
              title="Supabase Environment Variables missing on Vercel. Click for setup instructions."
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Database Disconnected</span>
              <span className="sm:hidden">DB Offline</span>
            </button>
          )}

          {/* Active Timer Pill if running */}
          {activeTimer && (
            <div className="flex items-center space-x-2 px-2.5 py-1 text-xs font-mono bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-full animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-semibold">{formatTimerDisplay(activeTimer.seconds)}</span>
              <button
                onClick={stopTimer}
                title="Stop timer"
                className="hover:bg-amber-500/20 rounded p-0.5 transition-colors"
              >
                <Square className="w-3 h-3 fill-amber-500" />
              </button>
            </div>
          )}

          {/* Quick Note Floating Button */}
          <button
            onClick={() => setIsQuickNoteOpen(true)}
            title="Open Quick Notes (Scratchpad)"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            <StickyNote className="w-4 h-4" />
          </button>

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Notifications Popover trigger */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title="Notifications"
              className="relative p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
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
              className="flex items-center space-x-2 p-1 hover:bg-secondary rounded-xl transition-all cursor-pointer focus:outline-none"
            >
              <UserAvatar user={currentUser} size="sm" showStatus />

              {/* Role badge pill */}
              <span className={`hidden xl:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadge.className}`}>
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
                      <p className="font-bold text-foreground text-xs truncate">{currentUser.full_name}</p>
                      <p className="text-muted-foreground truncate text-[11px]">{currentUser.email}</p>
                      {currentUser.username && (
                        <p className="text-primary text-[10px] font-mono">@{currentUser.username}</p>
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
                      className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                    >
                      Team & RBAC Permissions
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setActiveView("settings");
                      }}
                      className="w-full text-left px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                    >
                      Workspace Settings & Database
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center space-x-2 cursor-pointer"
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
