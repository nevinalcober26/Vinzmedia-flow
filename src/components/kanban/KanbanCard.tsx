"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types";
import { useStore } from "@/context/StoreContext";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Clock,
  MoreHorizontal,
  GripVertical,
  AlertCircle,
  Copy,
  Trash2,
  ChevronRight,
} from "lucide-react";
import {
  formatShortDate,
  formatDuration,
  getPriorityBadgeColor,
  isOverdue,
} from "@/lib/utils";

interface KanbanCardProps {
  task: Task;
  isOverlay?: boolean;
}

export function KanbanCard({ task, isOverlay = false }: KanbanCardProps) {
  const {
    setEditingTask,
    users,
    columns,
    moveTask,
    duplicateTask,
    deleteTask,
  } = useStore();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityStyle = getPriorityBadgeColor(task.priority);
  const taskOverdue = isOverdue(task.due_date, task.status);

  // Subtask progress
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed).length || 0;

  // Assignee objects
  const assignedUsers = users.filter((u) =>
    (task.assignee_ids || []).includes(u.id)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border bg-card p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer ${
        isDragging
          ? "opacity-40 border-primary/50 shadow-lg scale-95"
          : "border-border/80 hover:border-border"
      } ${isOverlay ? "shadow-2xl ring-2 ring-primary rotate-1 cursor-grabbing" : ""}`}
      onClick={() => setEditingTask(task)}
    >
      {/* Top row: Priority & Drag Handle & Quick Menu */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center space-x-1.5 flex-wrap">
          {/* Priority pill */}
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} capitalize`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1 ${priorityStyle.dot}`}
            />
            {task.priority}
          </span>

          {/* First label if exists */}
          {task.labels?.[0] && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
              {task.labels[0]}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          {/* Drag Handle button */}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            title="Drag card"
            className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded hover:bg-secondary"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {/* Card menu button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              title="More options"
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Context Dropdown */}
            {isMenuOpen && (
              <div
                className="absolute right-0 top-6 w-44 rounded-xl bg-card border border-border shadow-xl py-1 z-50 text-xs animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                  Move to status
                </div>
                {columns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      moveTask(task.id, c.status_key);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 hover:bg-secondary flex items-center justify-between text-xs ${
                      task.status === c.status_key ? "font-semibold text-primary" : "text-foreground"
                    }`}
                  >
                    <span>{c.title}</span>
                    {task.status === c.status_key && <span className="text-xs">✓</span>}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => {
                    duplicateTask(task.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1 hover:bg-secondary flex items-center space-x-1.5 text-xs text-foreground"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => {
                    deleteTask(task.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1 hover:bg-destructive/10 flex items-center space-x-1.5 text-xs text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Title */}
      <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {/* Description Snippet if present */}
      {task.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3">
          {task.description}
        </p>
      )}

      {/* Subtask checklist progress preview */}
      {totalSubtasks > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span className="flex items-center space-x-1">
              <CheckSquare className="w-3 h-3 text-muted-foreground" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
            <span className="font-mono">
              {Math.round((completedSubtasks / totalSubtasks) * 100)}%
            </span>
          </div>
          <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{
                width: `${Math.round((completedSubtasks / totalSubtasks) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Card Footer: Due Date, Comments, Time, Assignees */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
        {/* Left: Metadata badges */}
        <div className="flex items-center space-x-2 text-muted-foreground">
          {/* Due date */}
          {task.due_date && (
            <span
              className={`flex items-center space-x-1 ${
                taskOverdue
                  ? "text-red-500 font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatShortDate(task.due_date)}</span>
            </span>
          )}

          {/* Comments count */}
          {task.comments?.length > 0 && (
            <span className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </span>
          )}

          {/* Tracked time */}
          {task.tracked_seconds > 0 && (
            <span className="flex items-center space-x-1 font-mono text-[10px]">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(task.tracked_seconds)}</span>
            </span>
          )}
        </div>

        {/* Right: Assignee Avatars (Stacked) */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {assignedUsers.slice(0, 3).map((u) => (
            <img
              key={u.id}
              src={u.avatar_url}
              alt={u.full_name}
              title={u.full_name}
              className="w-5 h-5 rounded-full object-cover ring-2 ring-card shadow-2xs"
            />
          ))}
          {assignedUsers.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-secondary text-[9px] font-bold text-muted-foreground flex items-center justify-center ring-2 ring-card">
              +{assignedUsers.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
