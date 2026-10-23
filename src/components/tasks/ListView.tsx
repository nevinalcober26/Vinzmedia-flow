"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm } from "@/context/ToastContext";
import { Task, PriorityLevel } from "@/types";
import {
  Search,
  Filter,
  ArrowUpDown,
  Check,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  CheckSquare,
  Clock,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  formatShortDate,
  formatDuration,
  getPriorityBadgeColor,
  isOverdue,
} from "@/lib/utils";

interface ListViewProps {
  projectId?: string | null;
}

export function ListView({ projectId }: ListViewProps) {
  const confirm = useConfirm();
  const {
    tasks,
    columns,
    users,
    projects,
    setEditingTask,
    updateTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    setIsCreateTaskModalOpen,
  } = useStore();

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"priority" | "due_date" | "title" | "status">("due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [rowDensity, setRowDensity] = useState<"comfortable" | "compact">("comfortable");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (projectId && task.project_id !== projectId) return false;
      if (
        searchFilter &&
        !task.title.toLowerCase().includes(searchFilter.toLowerCase()) &&
        !task.description.toLowerCase().includes(searchFilter.toLowerCase())
      ) {
        return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, projectId, searchFilter, priorityFilter, statusFilter]);

  // Group by status
  const groupedTasks = useMemo(() => {
    const groups: { column: (typeof columns)[0]; tasks: Task[] }[] = [];
    columns.forEach((col) => {
      const colTasks = filteredTasks
        .filter((t) => t.status === col.status_key)
        .sort((a, b) => {
          let compare = 0;
          if (sortBy === "title") {
            compare = a.title.localeCompare(b.title);
          } else if (sortBy === "priority") {
            const pOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            compare = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
          } else if (sortBy === "due_date") {
            compare = (a.due_date || "9999").localeCompare(b.due_date || "9999");
          }
          return sortDirection === "asc" ? compare : -compare;
        });
      groups.push({ column: col, tasks: colTasks });
    });
    return groups;
  }, [columns, filteredTasks, sortBy, sortDirection]);

  // Bulk Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleToggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* List Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Left Filter & Search */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-secondary/50 border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary w-40 md:w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            {columns.map((c) => (
              <option key={c.id} value={c.status_key}>
                {c.title}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary capitalize"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Density Toggle */}
          <button
            onClick={() =>
              setRowDensity(rowDensity === "comfortable" ? "compact" : "comfortable")
            }
            className="px-2.5 py-1.5 rounded-lg border border-border/80 bg-secondary/30 text-muted-foreground hover:text-foreground text-xs"
          >
            Density: {rowDensity}
          </button>
        </div>

        {/* Right Actions: Quick Add */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when tasks are selected) */}
      {selectedTaskIds.length > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-primary">
              {selectedTaskIds.length} tasks selected
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {/* Bulk Status Change */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateTasks(selectedTaskIds, { status: e.target.value });
                  setSelectedTaskIds([]);
                }
              }}
              defaultValue=""
              className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground"
            >
              <option value="" disabled>
                Move to Status...
              </option>
              {columns.map((c) => (
                <option key={c.id} value={c.status_key}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Bulk Delete */}
            <button
              onClick={() => {
                confirm({
                  title: "Delete Selected Tasks?",
                  message: `Are you sure you want to delete ${selectedTaskIds.length} tasks? This action cannot be undone.`,
                  confirmText: "Delete Tasks",
                  variant: "danger",
                  onConfirm: () => {
                    bulkDeleteTasks(selectedTaskIds);
                    setSelectedTaskIds([]);
                  },
                });
              }}
              className="px-2.5 py-1 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium hover:bg-destructive/90 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Listing */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-secondary/70 backdrop-blur-md border-b border-border/80 text-muted-foreground uppercase tracking-wider text-[10px]">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredTasks.length > 0 &&
                    selectedTaskIds.length === filteredTasks.length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-border text-primary"
                />
              </th>
              <th className="px-3 py-2.5 font-semibold">Task Title</th>
              <th className="w-32 px-3 py-2.5 font-semibold">Status</th>
              <th className="w-28 px-3 py-2.5 font-semibold">Priority</th>
              <th className="w-36 px-3 py-2.5 font-semibold">Assignees</th>
              <th className="w-28 px-3 py-2.5 font-semibold">Due Date</th>
              <th className="w-24 px-3 py-2.5 font-semibold">Time</th>
            </tr>
          </thead>

          {/* Table Body Groups */}
          <tbody>
            {groupedTasks.map(({ column, tasks: colTasks }) => {
              const isCollapsed = collapsedGroups[column.status_key];
              return (
                <React.Fragment key={column.id}>
                  {/* Group Header Row */}
                  <tr className="bg-secondary/30 border-b border-border/40 font-semibold">
                    <td colSpan={7} className="px-3 py-2">
                      <button
                        onClick={() => toggleGroupCollapse(column.status_key)}
                        className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors text-xs"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: column.color || "#6366f1" }}
                        />
                        <span>{column.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({colTasks.length})
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* Task Rows */}
                  {!isCollapsed &&
                    colTasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      const priorityStyle = getPriorityBadgeColor(task.priority);
                      const taskOverdue = isOverdue(task.due_date, task.status);
                      const assigned = users.filter((u) =>
                        (task.assignee_ids || []).includes(u.id)
                      );

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setEditingTask(task)}
                          className={`border-b border-border/30 hover:bg-secondary/40 transition-colors cursor-pointer ${
                            isSelected ? "bg-primary/5" : ""
                          } ${rowDensity === "compact" ? "h-9" : "h-12"}`}
                        >
                          {/* Checkbox */}
                          <td
                            className="px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectTask(task.id)}
                              className="rounded border-border text-primary"
                            />
                          </td>

                          {/* Title */}
                          <td className="px-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                                {task.title}
                              </span>
                              {task.subtasks?.length > 0 && (
                                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                                  {task.subtasks.filter((s) => s.completed).length}/
                                  {task.subtasks.length}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Dropdown Inline */}
                          <td className="px-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateTask(task.id, { status: e.target.value })
                              }
                              className="bg-transparent text-xs text-foreground border border-border/60 rounded px-1.5 py-0.5"
                            >
                              {columns.map((c) => (
                                <option key={c.id} value={c.status_key}>
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Priority Dropdown Inline */}
                          <td className="px-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={task.priority}
                              onChange={(e) =>
                                updateTask(task.id, {
                                  priority: e.target.value as PriorityLevel,
                                })
                              }
                              className={`text-[10px] font-semibold rounded px-2 py-0.5 border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} capitalize`}
                            >
                              <option value="urgent">Urgent</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </td>

                          {/* Assignees */}
                          <td className="px-3">
                            <div className="flex items-center -space-x-1.5">
                              {assigned.slice(0, 3).map((u) => (
                                <img
                                  key={u.id}
                                  src={u.avatar_url}
                                  alt={u.full_name}
                                  title={u.full_name}
                                  className="w-5 h-5 rounded-full object-cover ring-2 ring-background"
                                />
                              ))}
                            </div>
                          </td>

                          {/* Due Date */}
                          <td className="px-3 font-mono">
                            {task.due_date ? (
                              <span
                                className={`text-[11px] ${
                                  taskOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
                                }`}
                              >
                                {formatShortDate(task.due_date)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">--</span>
                            )}
                          </td>

                          {/* Time */}
                          <td className="px-3 font-mono text-[11px] text-muted-foreground">
                            {task.tracked_seconds > 0
                              ? formatDuration(task.tracked_seconds)
                              : "--"}
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
