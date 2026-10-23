"use client";

import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskColumn, Task } from "@/types";
import { KanbanCard } from "./KanbanCard";
import { useStore } from "@/context/StoreContext";
import { MONDAY_STATUSES } from "@/lib/mondayTheme";
import {
  Plus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";

interface KanbanColumnProps {
  column: TaskColumn;
  tasks: Task[];
  department?: string;
  droppableId?: string;
  isRowMode?: boolean;
}

export function KanbanColumn({
  column,
  tasks,
  department,
  droppableId,
  isRowMode = false,
}: KanbanColumnProps) {
  const {
    createTask,
    updateColumn,
    deleteColumn,
    setIsCreateTaskModalOpen,
    activeProject,
  } = useStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const effectiveDroppableId =
    droppableId ||
    (department ? `${department}::${column.status_key}` : column.status_key);

  const { setNodeRef, isOver } = useDroppable({
    id: effectiveDroppableId,
    data: {
      type: "Column",
      column,
      department,
    },
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    createTask({
      title: quickTitle.trim(),
      status: column.status_key,
      department: department || undefined,
      project_id: activeProject?.id,
    });
    setQuickTitle("");
    setIsQuickAdding(false);
  };

  const handleRename = () => {
    if (columnTitle.trim() && columnTitle !== column.title) {
      updateColumn(column.id, { title: columnTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const taskIds = tasks.map((t) => t.id);

  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        onClick={() => setIsCollapsed(false)}
        className={`w-12 ${
          isRowMode ? "min-h-[160px]" : "h-[calc(100vh-190px)]"
        } rounded-2xl bg-secondary/30 border border-border/80 flex flex-col items-center py-4 cursor-pointer hover:bg-secondary/60 transition-colors select-none`}
      >
        <span
          className="w-2.5 h-2.5 rounded-full mb-3"
          style={{ backgroundColor: column.color || "#6366f1" }}
        />
        <span className="w-5 h-5 rounded-full bg-secondary text-[10px] font-bold text-muted-foreground flex items-center justify-center mb-4">
          {tasks.length}
        </span>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-semibold text-muted-foreground tracking-wider [writing-mode:vertical-rl] rotate-180">
            {column.title}
          </span>
        </div>
      </div>
    );
  }

  const statusConfig = MONDAY_STATUSES[column.status_key];
  const columnColor = statusConfig?.bg || column.color || "#0073ea";

  return (
    <div
      ref={setNodeRef}
      style={{ borderTop: `4px solid ${columnColor}` }}
      className={`w-72 md:w-80 flex-shrink-0 flex flex-col rounded-2xl bg-secondary/30 border transition-all ${
        isOver
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : "border-border/60 hover:border-border/90"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border/40">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span
            className="w-3 h-3 rounded-md flex-shrink-0 shadow-2xs"
            style={{ backgroundColor: columnColor }}
          />

          {isEditingTitle ? (
            <div className="flex items-center space-x-1 flex-1">
              <input
                type="text"
                value={columnTitle}
                onChange={(e) => setColumnTitle(e.target.value)}
                autoFocus
                onBlur={handleRename}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="w-full text-xs font-semibold bg-background border border-primary px-1.5 py-0.5 rounded outline-hidden"
              />
              <button
                onClick={handleRename}
                className="p-1 text-primary hover:bg-primary/10 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <h3
              onClick={() => setIsEditingTitle(true)}
              className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
              title="Click to rename"
            >
              {column.title}
            </h3>
          )}

          {/* Task Count Badge */}
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        {/* Column Actions: Quick Add, Collapse, Menu */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsQuickAdding(!isQuickAdding)}
            title="Quick add task in column"
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse column"
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-6 w-36 rounded-xl bg-card border border-border shadow-xl py-1 z-50 text-xs animate-in fade-in"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center space-x-2 text-foreground"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Rename</span>
                  </button>
                  {!column.is_default && (
                    <button
                      onClick={() => deleteColumn(column.id)}
                      className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 flex items-center space-x-2 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Form */}
      {isQuickAdding && (
        <form onSubmit={handleQuickAdd} className="p-2 border-b border-border/40 bg-card/60">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
            className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-hidden focus:ring-1 focus:ring-primary mb-2"
          />
          <div className="flex items-center justify-end space-x-1.5">
            <button
              type="button"
              onClick={() => setIsQuickAdding(false)}
              className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-2.5 py-1 text-[11px] bg-primary text-primary-foreground font-semibold rounded-md shadow-xs disabled:opacity-50"
            >
              Add Card
            </button>
          </div>
        </form>
      )}

      {/* Cards List with SortableContext */}
      <div
        className={`flex-1 overflow-y-auto p-2.5 space-y-3 min-h-[140px] ${
          isRowMode ? "max-h-[380px]" : "max-h-[calc(100vh-220px)]"
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isQuickAdding && (
          <div className="h-32 border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs text-muted-foreground">No tasks in this column</p>
            <button
              onClick={() => setIsQuickAdding(true)}
              className="mt-2 text-xs text-primary font-medium hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add task</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
