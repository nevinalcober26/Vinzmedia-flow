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
import { useToast } from "@/context/ToastContext";
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
  Building2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  Rows,
  Columns as ColumnsIcon,
  Check,
} from "lucide-react";
import { getDepartmentBadge, DEFAULT_DEPARTMENTS } from "@/lib/taskTypes";
import confetti from "canvas-confetti";
import { ShareBoard } from "@/components/sharing/ShareBoard";

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
    activeProject,
    updateProject,
    bulkUpdateTasks,
    setIsCreateTaskModalOpen,
  } = useStore();
  const toast = useToast();

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // View Mode: Group by Department Rows (Default!) or Standard Columns
  const [groupBy, setGroupBy] = useState<"department" | "none">("department");

  // Filters State
  const [searchFilter, setSearchFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // Department Management State
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDeptMenu, setEditingDeptMenu] = useState<string | null>(null);
  const [renamingDept, setRenamingDept] = useState<{ oldName: string; newName: string } | null>(null);

  // Active Project Reference
  const currentProject = useMemo(() => {
    if (projectId) return projects.find((p) => p.id === projectId) || null;
    return activeProject || null;
  }, [projectId, projects, activeProject]);

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

  // Compute active departments for this project
  const projectDepartments = useMemo(() => {
    const configured = currentProject?.departments || [];
    let list: string[] = [];

    if (configured.length > 0) {
      list = [...configured];
    } else {
      // Sensible initial departments
      list = ["Design & Creative", "Marketing & Growth", "Engineering"];
    }

    // Include any custom department from tasks that aren't in the list
    filteredTasks.forEach((t) => {
      if (t.department && !list.includes(t.department)) {
        list.push(t.department);
      }
    });

    // Check if there are tasks with no department assigned
    const hasUnassigned = filteredTasks.some((t) => !t.department || t.department.trim() === "");
    if (hasUnassigned && !list.includes("General / Unassigned")) {
      list.push("General / Unassigned");
    }

    return list;
  }, [currentProject, filteredTasks]);

  // Flat grouping tasks by column status (for Standard Columns mode)
  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((col) => {
      map[col.status_key] = filteredTasks
        .filter((t) => t.status === col.status_key)
        .sort((a, b) => a.order_index - b.order_index);
    });
    return map;
  }, [columns, filteredTasks]);

  // Department rows grouping: tasksByDeptAndColumn[dept][status_key]
  const tasksByDeptAndColumn = useMemo(() => {
    const matrix: Record<string, Record<string, Task[]>> = {};

    projectDepartments.forEach((dept) => {
      matrix[dept] = {};
      columns.forEach((col) => {
        matrix[dept][col.status_key] = [];
      });
    });

    filteredTasks.forEach((task) => {
      const taskDept =
        task.department && projectDepartments.includes(task.department)
          ? task.department
          : projectDepartments.includes("General / Unassigned")
          ? "General / Unassigned"
          : projectDepartments[0] || "General";

      if (!matrix[taskDept]) {
        matrix[taskDept] = {};
      }
      if (!matrix[taskDept][task.status]) {
        matrix[taskDept][task.status] = [];
      }
      matrix[taskDept][task.status].push(task);
    });

    // Sort tasks in each cell by order_index
    projectDepartments.forEach((dept) => {
      if (matrix[dept]) {
        columns.forEach((col) => {
          if (matrix[dept][col.status_key]) {
            matrix[dept][col.status_key].sort((a, b) => a.order_index - b.order_index);
          }
        });
      }
    });

    return matrix;
  }, [projectDepartments, columns, filteredTasks]);

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

    // Dragging over another task in a column or department
    if (isOverTask) {
      const overTask = tasks.find((t) => t.id === overId);
      if (
        overTask &&
        (currentTask.status !== overTask.status || currentTask.department !== overTask.department)
      ) {
        moveTask(activeId, overTask.status, overTask.order_index, overTask.department);
      }
    }

    // Dragging directly over a column container
    if (isOverColumn) {
      if (overId.includes("::")) {
        const [targetDept, targetColKey] = overId.split("::");
        if (currentTask.status !== targetColKey || currentTask.department !== targetDept) {
          moveTask(activeId, targetColKey, undefined, targetDept);
        }
      } else {
        if (currentTask.status !== overId) {
          moveTask(activeId, overId);
        }
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

    let targetStatus = draggedTask.status;
    let targetDept = draggedTask.department;
    let targetIndex = draggedTask.order_index;

    if (over.data.current?.type === "Column") {
      if (overId.includes("::")) {
        const [d, s] = overId.split("::");
        targetDept = d;
        targetStatus = s;
      } else {
        targetStatus = overId;
      }
      const existingInCell = (tasksByDeptAndColumn[targetDept || ""]?.[targetStatus] || []);
      targetIndex = existingInCell.length;
    } else if (over.data.current?.type === "Task") {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        targetDept = overTask.department;
        targetIndex = overTask.order_index;
      }
    }

    // Move task
    moveTask(activeId, targetStatus, targetIndex, targetDept);

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

  // Toggle department collapse
  const toggleCollapseDept = (deptName: string) => {
    setCollapsedDepts((prev) => ({
      ...prev,
      [deptName]: !prev[deptName],
    }));
  };

  // Add new department to project
  const handleAddDepartment = (nameToAdd?: string) => {
    const name = (nameToAdd || newDepartmentName).trim();
    if (!name) return;

    if (projectDepartments.some((d) => d.toLowerCase() === name.toLowerCase())) {
      toast.error("Department Exists", `"${name}" is already in this project.`);
      return;
    }

    const updatedList = [...projectDepartments, name];
    if (currentProject) {
      updateProject(currentProject.id, { departments: updatedList });
    }
    setNewDepartmentName("");
    setIsAddingDepartment(false);
    toast.success("Department Added", `Added department row "${name}"`);
  };

  // Remove department from project
  const handleRemoveDepartment = (deptName: string) => {
    if (!currentProject) return;
    const updatedList = projectDepartments.filter((d) => d !== deptName);
    updateProject(currentProject.id, { departments: updatedList });
    setEditingDeptMenu(null);
    toast.success("Department Removed", `Removed department row "${deptName}"`);
  };

  // Rename department
  const handleRenameDepartmentSubmit = () => {
    if (!renamingDept || !renamingDept.newName.trim() || !currentProject) return;
    const oldName = renamingDept.oldName;
    const newName = renamingDept.newName.trim();
    if (oldName === newName) {
      setRenamingDept(null);
      return;
    }

    const updatedList = projectDepartments.map((d) => (d === oldName ? newName : d));
    updateProject(currentProject.id, { departments: updatedList });

    // Update tasks under this department
    const matchingTasks = tasks.filter(
      (t) => t.project_id === currentProject.id && t.department === oldName
    );
    if (matchingTasks.length > 0) {
      bulkUpdateTasks(matchingTasks.map((t) => t.id), { department: newName });
    }

    setRenamingDept(null);
    setEditingDeptMenu(null);
    toast.success("Department Renamed", `Renamed to "${newName}"`);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Kanban Filters, Search & View Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        {/* Left Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ShareBoard projectId={currentProject?.id} />
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

        {/* Right: View Mode Toggle & Actions */}
        <div className="flex items-center space-x-2">
          {/* Grouping View Toggle: Department Rows vs Standard Columns */}
          <div className="flex items-center bg-secondary/50 p-0.5 rounded-lg border border-border/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGroupBy("department")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                groupBy === "department"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Organize tasks into horizontal Department Rows"
            >
              <Rows className="w-3.5 h-3.5 text-primary" />
              <span>Department Rows</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("none")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                groupBy === "none"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Standard single-row Kanban columns"
            >
              <ColumnsIcon className="w-3.5 h-3.5" />
              <span>Standard Columns</span>
            </button>
          </div>

          {/* Add Column Button */}
          {!isAddingColumn ? (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-dashed border-border hover:border-border/80 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
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
                className="px-2 py-1 text-xs bg-primary text-primary-foreground font-medium rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingColumn(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Kanban Drag and Drop Workspace */}
      <div className="flex-1 overflow-x-auto overflow-y-auto pb-8 space-y-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {groupBy === "department" ? (
            /* =======================================================
               DEPARTMENT ROWS (SWIMLANES) LAYOUT
               ======================================================= */
            <div className="space-y-6 min-w-max pb-8">
              {projectDepartments.map((dept) => {
                const isCollapsed = Boolean(collapsedDepts[dept]);
                const badge = getDepartmentBadge(dept);
                const deptTasks = filteredTasks.filter((t) =>
                  dept === "General / Unassigned"
                    ? !t.department || t.department === "General / Unassigned"
                    : t.department === dept
                );
                const doneCount = deptTasks.filter((t) => t.status === "done").length;
                const progressPct =
                  deptTasks.length > 0 ? Math.round((doneCount / deptTasks.length) * 100) : 0;

                return (
                  <div
                    key={dept}
                    className="p-4 rounded-3xl border border-border/80 bg-card/60 shadow-2xs space-y-3.5 transition-all"
                  >
                    {/* Department Row Header Bar */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2.5">
                        {/* Collapse/Expand Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleCollapseDept(dept)}
                          className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                          title={isCollapsed ? "Expand department row" : "Collapse department row"}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isCollapsed ? "-rotate-90" : ""
                            }`}
                          />
                        </button>

                        {/* Department Badge Pill */}
                        {renamingDept?.oldName === dept ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={renamingDept.newName}
                              onChange={(e) =>
                                setRenamingDept({ ...renamingDept, newName: e.target.value })
                              }
                              autoFocus
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleRenameDepartmentSubmit()
                              }
                              className="px-2 py-0.5 text-xs font-bold bg-background border border-primary rounded-lg text-foreground outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={handleRenameDepartmentSubmit}
                              className="p-1 text-primary hover:bg-primary/10 rounded-md"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingDept(null)}
                              className="p-1 text-muted-foreground hover:bg-secondary rounded-md"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1.5 shadow-2xs ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{dept}</span>
                          </span>
                        )}

                        {/* Task Count & Progress */}
                        <span className="text-xs font-semibold text-muted-foreground">
                          {deptTasks.length} {deptTasks.length === 1 ? "task" : "tasks"}
                          {doneCount > 0 && ` • ${doneCount} completed`}
                        </span>

                        {deptTasks.length > 0 && (
                          <div className="hidden sm:flex items-center space-x-1.5 pl-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                              {progressPct}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Row Actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateTaskModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add task</span>
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingDeptMenu(editingDeptMenu === dept ? null : dept)
                            }
                            className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {editingDeptMenu === dept && (
                            <>
                              <div
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={() => setEditingDeptMenu(null)}
                              />
                              <div className="absolute right-0 top-7 w-40 rounded-xl bg-card border border-border shadow-xl py-1 z-50 text-xs animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingDept({ oldName: dept, newName: dept });
                                    setEditingDeptMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center space-x-2 text-foreground"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDepartment(dept)}
                                  className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 flex items-center space-x-2 text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove Row</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Department Columns Row */}
                    {!isCollapsed && (
                      <div className="flex items-start space-x-4 overflow-x-auto pb-1 pt-1">
                        {columns
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((column) => (
                            <KanbanColumn
                              key={`${dept}-${column.id}`}
                              column={column}
                              department={dept}
                              droppableId={`${dept}::${column.status_key}`}
                              tasks={tasksByDeptAndColumn[dept]?.[column.status_key] || []}
                              isRowMode
                            />
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bottom: Add Department Row Button / Panel */}
              <div className="pt-2">
                {!isAddingDepartment ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingDepartment(true)}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/50 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-secondary/20 flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Add Department Row to Project</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-card border border-primary/40 shadow-md space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span>Add New Department Row</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingDepartment(false)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Department name (e.g. Content & Copy, Mobile Dev, QA)..."
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleAddDepartment()}
                        className="flex-1 bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddDepartment()}
                        disabled={!newDepartmentName.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                      >
                        Add Row
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingDepartment(false)}
                        className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Quick Preset Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_DEPARTMENTS.filter(
                          (d) => !projectDepartments.includes(d)
                        ).map((sugg) => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => handleAddDepartment(sugg)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-secondary/60 hover:bg-secondary text-foreground border border-border/80 transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5 text-primary" />
                            <span>{sugg}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =======================================================
               STANDARD COLUMNS LAYOUT (FLAT)
               ======================================================= */
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
          )}

          {/* Active dragging overlay card */}
          <DragOverlay>
            {activeTask ? <KanbanCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
