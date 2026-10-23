"use client";

import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  FolderKanban,
  CheckSquare,
  FileText,
  Megaphone,
  Sun,
  Moon,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  Receipt,
} from "lucide-react";
import { ActiveView } from "@/types";

export function CommandPalette() {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    tasks,
    projects,
    notes,
    announcements,
    users,
    setActiveView,
    setSelectedProjectId,
    setEditingTask,
    setIsCreateTaskModalOpen,
    setIsCreateProjectModalOpen,
    setIsQuickNoteOpen,
    toggleTheme,
    theme,
  } = useStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const handleClose = () => {
    setIsCommandPaletteOpen(false);
  };

  // Static commands
  const staticCommands = [
    {
      id: "cmd_new_task",
      category: "Quick Actions",
      title: "Create new task",
      subtitle: "Add a task to current project",
      icon: Plus,
      action: () => {
        setIsCreateTaskModalOpen(true);
        handleClose();
      },
    },
    {
      id: "cmd_new_project",
      category: "Quick Actions",
      title: "Create new project",
      subtitle: "Start a new team project",
      icon: FolderKanban,
      action: () => {
        setIsCreateProjectModalOpen(true);
        handleClose();
      },
    },
    {
      id: "cmd_new_note",
      category: "Quick Actions",
      title: "Open Quick Note scratchpad",
      subtitle: "Take rich notes and brainstorm",
      icon: FileText,
      action: () => {
        setIsQuickNoteOpen(true);
        handleClose();
      },
    },
    {
      id: "cmd_toggle_theme",
      category: "Preferences",
      title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
      subtitle: "Toggle application appearance",
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        toggleTheme();
        handleClose();
      },
    },
    {
      id: "cmd_my_tasks",
      category: "Navigation",
      title: "Go to My Tasks",
      subtitle: "View work assigned to you",
      icon: CheckSquare,
      action: () => {
        setSelectedProjectId(null);
        setActiveView("my_tasks");
        handleClose();
      },
    },
    {
      id: "cmd_billing",
      category: "Navigation",
      title: "Go to Billing & Invoices",
      subtitle: "Project pricing, milestones & currency conversions",
      icon: Receipt,
      action: () => {
        setSelectedProjectId(null);
        setActiveView("billing");
        handleClose();
      },
    },
    {
      id: "cmd_calendar",
      category: "Navigation",
      title: "Go to Calendar",
      subtitle: "Master schedule and deadlines",
      icon: Calendar,
      action: () => {
        setSelectedProjectId(null);
        setActiveView("calendar");
        handleClose();
      },
    },
    {
      id: "cmd_announcements",
      category: "Navigation",
      title: "View Announcements",
      subtitle: "Company & team bulletins",
      icon: Megaphone,
      action: () => {
        setSelectedProjectId(null);
        setActiveView("announcements");
        handleClose();
      },
    },
  ];

  // Search results
  const lowerQuery = query.toLowerCase().trim();

  const matchingTasks = lowerQuery
    ? tasks
        .filter(
          (t) =>
            t.title.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.labels.some((l) => l.toLowerCase().includes(lowerQuery))
        )
        .slice(0, 5)
        .map((t) => ({
          id: `task_${t.id}`,
          category: "Tasks",
          title: t.title,
          subtitle: `In ${projects.find((p) => p.id === t.project_id)?.name || "Project"} • ${t.status}`,
          icon: CheckSquare,
          action: () => {
            setEditingTask(t);
            handleClose();
          },
        }))
    : [];

  const matchingProjects = lowerQuery
    ? projects
        .filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 4)
        .map((p) => ({
          id: `proj_${p.id}`,
          category: "Projects",
          title: p.name,
          subtitle: `${p.status} • ${p.progress}% completed`,
          icon: FolderKanban,
          action: () => {
            setSelectedProjectId(p.id);
            setActiveView("project_detail");
            handleClose();
          },
        }))
    : [];

  const matchingNotes = lowerQuery
    ? notes
        .filter(
          (n) =>
            n.title.toLowerCase().includes(lowerQuery) ||
            n.content.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 3)
        .map((n) => ({
          id: `note_${n.id}`,
          category: "Notes",
          title: n.title,
          subtitle: "Note document",
          icon: FileText,
          action: () => {
            setActiveView("notes");
            handleClose();
          },
        }))
    : [];

  const matchingStatic = staticCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(lowerQuery) ||
      c.subtitle.toLowerCase().includes(lowerQuery)
  );

  const combinedResults = lowerQuery
    ? [...matchingTasks, ...matchingProjects, ...matchingNotes, ...matchingStatic]
    : staticCommands;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % combinedResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedResults.length) % combinedResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (combinedResults[selectedIndex]) {
        combinedResults[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Search Input bar */}
        <div className="flex items-center px-4 py-3 border-b border-border/80 bg-secondary/20">
          <Search className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search tasks, projects, notes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-hidden"
          />
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {combinedResults.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            combinedResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-medium truncate ${
                          isSelected ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p
                        className={`text-[10px] truncate ${
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-primary-foreground" : "text-muted-foreground/40"
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-secondary/30 text-[11px] text-muted-foreground">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">↑</kbd>{" "}
              <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">Esc</kbd> to close
          </span>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
