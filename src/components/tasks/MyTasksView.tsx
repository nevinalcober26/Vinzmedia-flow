"use client";

import { EmptyState } from "@/components/common/EmptyState";
import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  Filter,
} from "lucide-react";
import {
  formatDate,
  formatDuration,
  getPriorityBadgeColor,
  isOverdue,
} from "@/lib/utils";

export function MyTasksView() {
  const {
    tasks,
    currentUser,
    projects,
    columns,
    setEditingTask,
    updateTask,
    setIsCreateTaskModalOpen,
  } = useStore();

  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");

  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isAssigned = (t.assignee_ids || []).includes(currentUser.id);
      if (!isAssigned) return false;
      if (selectedProjectId !== "all" && t.project_id !== selectedProjectId) return false;
      if (
        search &&
        !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.description.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, currentUser.id, selectedProjectId, search]);

  const inProgressTasks = myTasks.filter((t) => t.status === "in_progress");
  const todoTasks = myTasks.filter((t) => t.status === "todo" || t.status === "backlog");
  const inReviewTasks = myTasks.filter((t) => t.status === "in_review");
  const doneTasks = myTasks.filter((t) => t.status === "done");

  const toggleTaskDone = (e: React.MouseEvent, taskId: string, isDone: boolean) => {
    e.stopPropagation();
    updateTask(taskId, { status: isDone ? "todo" : "done" });
  };

  const renderTaskItem = (task: (typeof tasks)[0]) => {
    const project = projects.find((p) => p.id === task.project_id);
    const priorityStyle = getPriorityBadgeColor(task.priority);
    const isDone = task.status === "done";
    const overdue = isOverdue(task.due_date, task.status);

    return (
      <div
        key={task.id}
        onClick={() => setEditingTask(task)}
        className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-secondary/40 transition-colors cursor-pointer group"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={(e) => toggleTaskDone(e, task.id, isDone)}
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              isDone
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-border hover:border-primary text-transparent"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>

          <div className="min-w-0">
            <h4
              className={`text-xs font-semibold truncate ${
                isDone ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {task.title}
            </h4>
            {project && (
              <span className="text-[10px] text-muted-foreground flex items-center space-x-1 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-sm"
                  style={{ backgroundColor: project.color }}
                />
                <span>{project.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} capitalize`}
          >
            {task.priority}
          </span>

          {task.due_date && (
            <span
              className={`font-mono text-[11px] ${
                overdue ? "text-red-500 font-semibold" : "text-muted-foreground"
              }`}
            >
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-base font-bold text-foreground">My Tasks & Focus</h2>
          <p className="text-xs text-muted-foreground">
            Personal workbench of all tasks assigned to {currentUser.full_name}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Task Sections */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-12">
        {/* In Progress Section */}
        {inProgressTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5" />
              <span>In Progress ({inProgressTasks.length})</span>
            </h3>
            <div className="space-y-2">{inProgressTasks.map(renderTaskItem)}</div>
          </div>
        )}

        {/* To Do Section */}
        {todoTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>To Do ({todoTasks.length})</span>
            </h3>
            <div className="space-y-2">{todoTasks.map(renderTaskItem)}</div>
          </div>
        )}

        {/* In Review Section */}
        {inReviewTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center space-x-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>In Review ({inReviewTasks.length})</span>
            </h3>
            <div className="space-y-2">{inReviewTasks.map(renderTaskItem)}</div>
          </div>
        )}

        {/* Done Section */}
        {doneTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed ({doneTasks.length})</span>
            </h3>
            <div className="space-y-2 opacity-80">{doneTasks.map(renderTaskItem)}</div>
          </div>
        )}

        {myTasks.length === 0 && (
          <EmptyState
            icon={CheckSquare}
            title={search || selectedProjectId !== "all" ? "No tasks match your filters" : "A clear space for your next task"}
            description={search || selectedProjectId !== "all" ? "Try another search or view tasks across all projects." : "Tasks assigned to you will appear here. Add a task to start planning your work."}
            actionLabel={search || selectedProjectId !== "all" ? "Clear filters" : "Add task"}
            onAction={() => {
              if (search || selectedProjectId !== "all") { setSearch(""); setSelectedProjectId("all"); }
              else setIsCreateTaskModalOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
