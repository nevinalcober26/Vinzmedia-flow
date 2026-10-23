"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm } from "@/context/ToastContext";
import { Task, PriorityLevel } from "@/types";
import {
  Search,
  Filter,
  Check,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  MessageSquare,
  Clock,
  Sparkles,
  SlidersHorizontal,
  FolderKanban,
  UserPlus,
} from "lucide-react";
import { formatShortDate, formatDuration, isOverdue } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";
import { MondayStatusCell } from "@/components/common/MondayStatusCell";
import { MondayPriorityCell } from "@/components/common/MondayPriorityCell";
import {
  MondayBatteryBar,
} from "@/components/common/MondayBatteryBar";
import {
  calculateStatusBattery,
  calculatePriorityBattery,
  MONDAY_GROUP_COLORS,
} from "@/lib/mondayTheme";

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
    createTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    setIsCreateTaskModalOpen,
    activeProject,
  } = useStore();

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Quick Inline Add state per group
  const [inlineTaskTitles, setInlineTaskTitles] = useState<Record<string, string>>({});

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (projectId && task.project_id !== projectId) return false;
      if (
        searchFilter &&
        !task.title.toLowerCase().includes(searchFilter.toLowerCase()) &&
        !task.description?.toLowerCase().includes(searchFilter.toLowerCase())
      ) {
        return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (
        assigneeFilter !== "all" &&
        !(task.assignee_ids || []).includes(assigneeFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, projectId, searchFilter, priorityFilter, statusFilter, assigneeFilter]);

  // Group by status
  const groupedTasks = useMemo(() => {
    return columns.map((col, idx) => {
      const colTasks = filteredTasks.filter((t) => t.status === col.status_key);
      const groupColor =
        col.color || MONDAY_GROUP_COLORS[idx % MONDAY_GROUP_COLORS.length];
      return {
        column: col,
        color: groupColor,
        tasks: colTasks,
      };
    });
  }, [columns, filteredTasks]);

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

  // Inline Quick Add Submission
  const handleInlineSubmit = (statusKey: string, e: React.FormEvent) => {
    e.preventDefault();
    const title = inlineTaskTitles[statusKey]?.trim();
    if (!title) return;

    createTask({
      title,
      status: statusKey,
      project_id: projectId || activeProject?.id,
      priority: "medium",
    });

    setInlineTaskTitles((prev) => ({ ...prev, [statusKey]: "" }));
  };

  return (
    <div className="flex flex-col h-full space-y-4 font-sans">
      {/* Monday.com Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Signature Monday Blue "+ New Item" Button */}
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0073ea] hover:bg-[#0060c0] active:scale-98 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Item</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in board..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-secondary/40 hover:bg-secondary/60 focus:bg-background border border-border/70 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-[#0073ea] w-36 sm:w-52 transition-all"
            />
          </div>

          {/* Filter by Person */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-secondary/40 hover:bg-secondary/60 border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-[#0073ea] cursor-pointer"
          >
            <option value="all">👤 All People</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>

          {/* Filter by Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-secondary/40 hover:bg-secondary/60 border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-[#0073ea] cursor-pointer"
          >
            <option value="all">⚡ All Priorities</option>
            <option value="urgent">Critical ⚡</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Right Info */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredTasks.length}</span>
          <span>Items</span>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="p-2.5 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center space-x-2 text-foreground font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#0073ea] text-white flex items-center justify-center text-[10px]">
              {selectedTaskIds.length}
            </span>
            <span>Items Selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkUpdateTasks(selectedTaskIds, { status: e.target.value });
                  setSelectedTaskIds([]);
                }
              }}
              className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground cursor-pointer"
            >
              <option value="" disabled>
                Change Status to...
              </option>
              {columns.map((c) => (
                <option key={c.id} value={c.status_key}>
                  {c.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                confirm({
                  title: "Delete Selected Items?",
                  message: `Are you sure you want to delete ${selectedTaskIds.length} items? This cannot be undone.`,
                  confirmText: "Delete Items",
                  variant: "danger",
                  onConfirm: () => {
                    bulkDeleteTasks(selectedTaskIds);
                    setSelectedTaskIds([]);
                  },
                });
              }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Monday.com Groups Listing */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-10">
        {groupedTasks.map(({ column, color, tasks: colTasks }) => {
          const isCollapsed = collapsedGroups[column.status_key];
          const statusBattery = calculateStatusBattery(colTasks);
          const priorityBattery = calculatePriorityBattery(colTasks);

          return (
            <div
              key={column.id}
              className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs"
            >
              {/* Group Header Banner */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-secondary/20 border-b border-border/60"
                style={{ borderLeft: `6px solid ${color}` }}
              >
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => toggleGroupCollapse(column.status_key)}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <h3
                    className="text-sm font-extrabold tracking-tight"
                    style={{ color }}
                  >
                    {column.title}
                  </h3>
                  <span className="text-[11px] font-bold text-muted-foreground font-mono bg-secondary/80 px-2 py-0.5 rounded-full">
                    {colTasks.length} {colTasks.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setIsCreateTaskModalOpen(true);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1 p-1 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add Task</span>
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    {/* Monday Columns Header */}
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border/70 text-muted-foreground text-[11px] font-semibold">
                        <th className="w-10 px-3 py-2 text-center border-r border-border/50">
                          <input
                            type="checkbox"
                            checked={
                              colTasks.length > 0 &&
                              colTasks.every((t) => selectedTaskIds.includes(t.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTaskIds((prev) => [
                                  ...prev,
                                  ...colTasks.map((t) => t.id).filter((id) => !prev.includes(id)),
                                ]);
                              } else {
                                setSelectedTaskIds((prev) =>
                                  prev.filter((id) => !colTasks.some((t) => t.id === id))
                                );
                              }
                            }}
                            className="rounded border-border text-[#0073ea] cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-2 border-r border-border/50 min-w-[220px]">
                          Item
                        </th>
                        <th className="w-14 px-2 py-2 text-center border-r border-border/50">
                          Updates
                        </th>
                        <th className="w-28 px-3 py-2 border-r border-border/50">
                          Owner
                        </th>
                        <th className="w-36 px-2 py-2 text-center border-r border-border/50">
                          Status
                        </th>
                        <th className="w-32 px-2 py-2 text-center border-r border-border/50">
                          Priority
                        </th>
                        <th className="w-32 px-3 py-2 border-r border-border/50">
                          Timeline / Due
                        </th>
                        <th className="w-24 px-3 py-2 text-right">
                          Tracked
                        </th>
                      </tr>
                    </thead>

                    {/* Monday Item Rows */}
                    <tbody className="divide-y divide-border/40">
                      {colTasks.map((task) => {
                        const isSelected = selectedTaskIds.includes(task.id);
                        const assigned = users.filter((u) =>
                          (task.assignee_ids || []).includes(u.id)
                        );
                        const taskOverdue = isOverdue(task.due_date, task.status);

                        return (
                          <tr
                            key={task.id}
                            className={`group hover:bg-secondary/30 transition-colors ${
                              isSelected ? "bg-primary/5" : ""
                            }`}
                            style={{ borderLeft: `4px solid ${color}` }}
                          >
                            {/* Checkbox */}
                            <td className="px-3 py-2 text-center border-r border-border/40">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectTask(task.id)}
                                className="rounded border-border text-[#0073ea] cursor-pointer"
                              />
                            </td>

                            {/* Task Title with Click-to-open Slide-over */}
                            <td className="px-4 py-2 border-r border-border/40">
                              <div className="flex items-center justify-between group/title">
                                <span
                                  onClick={() => setEditingTask(task)}
                                  className="font-medium text-foreground hover:text-[#0073ea] transition-colors cursor-pointer truncate max-w-md"
                                  title={task.title}
                                >
                                  {task.title}
                                </span>

                                {task.subtasks && task.subtasks.length > 0 && (
                                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded ml-2 shrink-0">
                                    {task.subtasks.filter((s) => s.completed).length}/
                                    {task.subtasks.length}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Monday Conversation / Updates Bubble */}
                            <td className="px-2 py-2 text-center border-r border-border/40">
                              <button
                                type="button"
                                onClick={() => setEditingTask(task)}
                                title="Open item updates & comments"
                                className={`inline-flex items-center space-x-1 px-1.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                                  task.comments && task.comments.length > 0
                                    ? "bg-[#0073ea]/15 text-[#0073ea] font-bold"
                                    : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary"
                                }`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {task.comments && task.comments.length > 0 && (
                                  <span>{task.comments.length}</span>
                                )}
                              </button>
                            </td>

                            {/* People / Owner Column */}
                            <td className="px-3 py-2 border-r border-border/40">
                              <div
                                onClick={() => setEditingTask(task)}
                                className="flex items-center space-x-1 cursor-pointer"
                              >
                                {assigned.length > 0 ? (
                                  <div className="flex -space-x-1.5">
                                    {assigned.slice(0, 3).map((u) => (
                                      <UserAvatar
                                        key={u.id}
                                        name={u.full_name}
                                        avatarUrl={u.avatar_url}
                                        size="xs"
                                        showStatus={false}
                                        className="ring-1 ring-card"
                                      />
                                    ))}
                                    {assigned.length > 3 && (
                                      <div className="w-5 h-5 rounded-full bg-secondary text-[9px] font-bold text-muted-foreground flex items-center justify-center ring-1 ring-card">
                                        +{assigned.length - 3}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/60 flex items-center justify-center text-muted-foreground hover:border-[#0073ea] hover:text-[#0073ea] transition-colors">
                                    <UserPlus className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Solid Monday Status Block */}
                            <td className="p-1 border-r border-border/40 min-w-[130px]">
                              <MondayStatusCell
                                status={task.status}
                                onChange={(newStatus) =>
                                  updateTask(task.id, { status: newStatus })
                                }
                              />
                            </td>

                            {/* Solid Monday Priority Block */}
                            <td className="p-1 border-r border-border/40 min-w-[110px]">
                              <MondayPriorityCell
                                priority={task.priority}
                                onChange={(newPriority) =>
                                  updateTask(task.id, { priority: newPriority })
                                }
                              />
                            </td>

                            {/* Due Date / Timeline Capsule */}
                            <td className="px-3 py-2 border-r border-border/40 font-mono">
                              {task.due_date ? (
                                <div
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] ${
                                    taskOverdue
                                      ? "bg-rose-500/15 text-rose-500 font-bold"
                                      : "bg-secondary/70 text-foreground"
                                  }`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatShortDate(task.due_date)}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50 text-[11px]">-</span>
                              )}
                            </td>

                            {/* Tracked Time */}
                            <td className="px-3 py-2 text-right font-mono text-[11px] text-muted-foreground">
                              {task.tracked_seconds > 0 ? (
                                <span className="text-foreground font-semibold">
                                  {formatDuration(task.tracked_seconds)}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Inline Quick "+ Add Task" Row */}
                      <tr
                        className="bg-secondary/10 hover:bg-secondary/20 transition-colors"
                        style={{ borderLeft: `4px solid ${color}` }}
                      >
                        <td className="px-3 py-2 text-center text-muted-foreground border-r border-border/40">
                          <Plus className="w-3.5 h-3.5 mx-auto" />
                        </td>
                        <td colSpan={7} className="p-1">
                          <form
                            onSubmit={(e) => handleInlineSubmit(column.status_key, e)}
                            className="flex items-center space-x-2 px-2"
                          >
                            <input
                              type="text"
                              value={inlineTaskTitles[column.status_key] || ""}
                              onChange={(e) =>
                                setInlineTaskTitles((prev) => ({
                                  ...prev,
                                  [column.status_key]: e.target.value,
                                }))
                              }
                              placeholder="+ Add Item..."
                              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden py-1.5"
                            />
                            {inlineTaskTitles[column.status_key]?.trim() && (
                              <button
                                type="submit"
                                className="px-2.5 py-1 bg-[#0073ea] text-white text-[11px] font-bold rounded-md shadow-xs cursor-pointer hover:bg-[#0060c0] shrink-0"
                              >
                                Add
                              </button>
                            )}
                          </form>
                        </td>
                      </tr>
                    </tbody>

                    {/* Monday.com Signature Battery Summary Footer */}
                    <tfoot>
                      <tr className="bg-secondary/30 border-t border-border/70 text-[11px]">
                        <td className="border-r border-border/40" />
                        <td className="px-4 py-2 font-bold text-muted-foreground uppercase tracking-wider text-[10px] border-r border-border/40">
                          Summary
                        </td>
                        <td className="border-r border-border/40" />
                        <td className="border-r border-border/40" />
                        {/* Status Battery Bar */}
                        <td className="p-2 border-r border-border/40">
                          <MondayBatteryBar segments={statusBattery} />
                        </td>
                        {/* Priority Battery Bar */}
                        <td className="p-2 border-r border-border/40">
                          <MondayBatteryBar segments={priorityBattery} />
                        </td>
                        <td className="border-r border-border/40" />
                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                          {colTasks.reduce((acc, t) => acc + (t.tracked_seconds || 0), 0) > 0
                            ? formatDuration(
                                colTasks.reduce(
                                  (acc, t) => acc + (t.tracked_seconds || 0),
                                  0
                                )
                              )
                            : "-"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
