"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { X, Plus, Calendar, AlertCircle, FolderKanban, Tag } from "lucide-react";
import { PriorityLevel } from "@/types";

export function CreateTaskModal() {
  const {
    isCreateTaskModalOpen,
    setIsCreateTaskModalOpen,
    defaultNewTaskStatus,
    createTask,
    projects,
    selectedProjectId,
    columns,
    users,
    currentUser,
  } = useStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(selectedProjectId || projects[0]?.id || "");
  const [status, setStatus] = useState(defaultNewTaskStatus || "todo");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([currentUser.id]);
  const [labelsInput, setLabelsInput] = useState("Feature");
  const [estimatedHours, setEstimatedHours] = useState(4);

  if (!isCreateTaskModalOpen) return null;

  const handleClose = () => {
    setIsCreateTaskModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const labels = labelsInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    createTask({
      title: title.trim(),
      description: description.trim(),
      project_id: projectId,
      status,
      priority,
      due_date: dueDate || undefined,
      assignee_ids: assigneeIds,
      labels: labels.length ? labels : ["General"],
      estimated_hours: Number(estimatedHours) || 0,
    });

    handleClose();
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Create New Task</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Task Title *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-background"
            />
          </div>

          {/* Project & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground flex items-center space-x-1">
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Project</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.status_key}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <label className="font-medium text-muted-foreground">Assignees</label>
            <div className="flex flex-wrap gap-1.5">
              {users.map((u) => {
                const isSelected = assigneeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="w-3.5 h-3.5 rounded-full object-cover"
                    />
                    <span>{u.full_name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Labels & Estimated Hours */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="font-medium text-muted-foreground flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Labels (comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="Frontend, API, High-Value"
                value={labelsInput}
                onChange={(e) => setLabelsInput(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Est. Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Description</label>
            <textarea
              rows={3}
              placeholder="Add key requirements or acceptance notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-background"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
