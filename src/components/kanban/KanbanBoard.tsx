"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useStore } from "@/context/StoreContext";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { Task, PriorityLevel } from "@/types";
import {
  Plus,
  Filter,
  Search,
  User as UserIcon,
  AlertCircle,
  X,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import confetti from "canvas-confetti";

interface KanbanBoardProps {
  projectId?: string | null;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const {
    columns,
    tasks,
    moveTask,
    reorderTasksInColumn,
    createColumn,
    users,
    projects,
  } = useStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Filters State
  const [searchFilter, setSearchFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // Sensors configuration with touch and keyboard accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Project filter
      if (projectId && task.project_id !== projectId) {
        return false;
      }
      // Search filter
      if (
        searchFilter &&
        !task.title.toLowerCase().includes(searchFilter.toLowerCase()) &&
        !task.description.toLowerCase().includes(searchFilter.toLowerCase()) &&
        !task.labels.some((l) => l.toLowerCase().includes(searchFilter.toLowerCase()))
      ) {
        return false;
      }
      // Assignee filter
      if (assigneeFilter !== "all" && !task.assignee_ids.includes(assigneeFilter)) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, projectId, searchFilter, assigneeFilter, priorityFilter]);

  // Group tasks by column status
  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((col) => {
      map[col.status_key] = filteredTasks
        .filter((t) => t.status === col.status_key)
        .sort((a, b) => a.order_index - b.order_index);
    });
    return map;
  }, [columns, filteredTasks]);

  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    const currentTask = tasks.find((t) => t.id === activeId);
    if (!currentTask) return;

    // Dragging over another task in a different column
    if (isOverTask) {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask && currentTask.status !== overTask.status) {
        moveTask(activeId, overTask.status, overTask.order_index);
      }
    }

    // Dragging directly over an empty column
    if (isOverColumn) {
      const overColKey = over.id as string;
      if (currentTask.status !== overColKey) {
        moveTask(activeId, overColKey);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    // Check if target was a column or a task
    let targetStatus = draggedTask.status;
    let targetIndex = draggedTask.order_index;

    if (over.data.current?.type === "Column") {
      targetStatus = over.id as string;
      targetIndex = (tasksByColumn[targetStatus] || []).length;
    } else if (over.data.current?.type === "Task") {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        targetIndex = overTask.order_index;
      }
    }

    // Move task
    moveTask(activeId, targetStatus, targetIndex);

    // If moved to "done", celebrate with confetti!
    if (targetStatus === "done" && draggedTask.status !== "done") {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    createColumn(newColumnTitle.trim());
    setNewColumnTitle("");
    setIsAddingColumn(false);
  };

  const clearFilters = () => {
    setSearchFilter("");
    setAssigneeFilter("all");
    setPriorityFilter("all");
  };

  const hasActiveFilters =
    searchFilter !== "" || assigneeFilter !== "all" || priorityFilter !== "all";

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Kanban Filters & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        {/* Left Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-secondary/50 border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary w-40 md:w-52"
            />
          </div>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
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

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: Add Column Button */}
        <div className="flex items-center space-x-2">
          {!isAddingColumn ? (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-dashed border-border hover:border-border/80 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Column</span>
            </button>
          ) : (
            <form onSubmit={handleCreateColumn} className="flex items-center space-x-1.5">
              <input
                type="text"
                placeholder="Column title..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                autoFocus
                className="px-2 py-1 text-xs bg-background border border-primary rounded-lg outline-hidden text-foreground w-36"
              />
              <button
                type="submit"
                disabled={!newColumnTitle.trim()}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground font-medium rounded-lg disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingColumn(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Kanban Drag and Drop Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-start space-x-4 h-[calc(100vh-210px)] min-w-max pb-2">
            {columns
              .sort((a, b) => a.order_index - b.order_index)
              .map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.status_key] || []}
                />
              ))}
          </div>

          {/* Active dragging overlay card */}
          <DragOverlay>
            {activeTask ? <KanbanCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
