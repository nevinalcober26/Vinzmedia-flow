"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Calendar,
  AlertCircle,
  FolderKanban,
  Tag,
  Check,
  Clock,
} from "lucide-react";
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
      project_id: projectId || projects[0]?.id || "proj_mobile",
      status,
      priority,
      due_date: dueDate || undefined,
      assignee_ids: assigneeIds,
      labels: labels.length ? labels : ["General"],
      estimated_hours: Number(estimatedHours) || 0,
    });

    setTitle("");
    setDescription("");
    handleClose();
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <AnimatePresence>
      {isCreateTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl overflow-hidden text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Create New Task</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
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
                  placeholder="e.g. Implement user authentication flow"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Add context, acceptance criteria, or relevant links..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none transition-all"
                />
              </div>

              {/* Project & Column Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Project</span>
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
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
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer capitalize"
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
                    <span>Priority Level</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="urgent">🔴 Urgent — Immediate action required</option>
                    <option value="high">🟠 High — Important milestone</option>
                    <option value="medium">🟡 Medium — Normal sprint backlog</option>
                    <option value="low">🟢 Low — Nice to have</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Target Due Date</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Assignees */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Assign Team Members</label>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => {
                    const isSelected = assigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleAssignee(u.id)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "bg-secondary/40 text-muted-foreground hover:bg-secondary border border-border/60"
                        }`}
                      >
                        <UserAvatar user={u} size="xs" />
                        <span>{u.full_name}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Labels & Estimation Row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tags (comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={labelsInput}
                    onChange={(e) => setLabelsInput(e.target.value)}
                    placeholder="Bug, Frontend, Sprint 1"
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Estimated Hours</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
