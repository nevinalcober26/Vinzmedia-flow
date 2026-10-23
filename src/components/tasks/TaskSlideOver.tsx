"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm } from "@/context/ToastContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  User as UserIcon,
  CheckSquare,
  Clock,
  Play,
  Square,
  Tag,
  Paperclip,
  MessageSquare,
  Smile,
  Trash2,
  Copy,
  FolderKanban,
  AlertCircle,
  Plus,
  Check,
  ChevronDown,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import {
  formatDate,
  formatDuration,
  formatRelativeTime,
  getPriorityBadgeColor,
  isOverdue,
} from "@/lib/utils";
import { PriorityLevel, Task } from "@/types";

export function TaskSlideOver() {
  const confirm = useConfirm();
  const {
    editingTask,
    setEditingTask,
    updateTask,
    deleteTask,
    duplicateTask,
    projects,
    users,
    columns,
    currentUser,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addComment,
    addCommentReaction,
    startTimer,
    stopTimer,
    activeTimer,
    addManualTimeEntry,
    tasks,
  } = useStore();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isManualTimeModalOpen, setIsManualTimeModalOpen] = useState(false);
  const [manualMinutes, setManualMinutes] = useState(30);

  const currentProject = editingTask ? projects.find((p) => p.id === editingTask.project_id) : null;
  const isTimerRunning = Boolean(editingTask && activeTimer?.taskId === editingTask.id);
  const isTaskOverdue = editingTask ? isOverdue(editingTask.due_date, editingTask.status) : false;

  // Subtask progress
  const totalSubtasks = editingTask?.subtasks?.length || 0;
  const completedSubtasks =
    editingTask?.subtasks?.filter((s) => s.completed).length || 0;
  const subtaskProgress =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newSubtaskTitle.trim()) return;
    addSubtask(editingTask.id, newSubtaskTitle.trim());
    setNewSubtaskTitle("");
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newCommentText.trim()) return;
    addComment(editingTask.id, newCommentText.trim());
    setNewCommentText("");
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newTagInput.trim()) return;
    const currentTags = editingTask.labels || [];
    if (!currentTags.includes(newTagInput.trim())) {
      updateTask(editingTask.id, { labels: [...currentTags, newTagInput.trim()] });
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!editingTask) return;
    const updated = (editingTask.labels || []).filter((t) => t !== tagToRemove);
    updateTask(editingTask.id, { labels: updated });
  };

  const handleToggleAssignee = (userId: string) => {
    if (!editingTask) return;
    const current = editingTask.assignee_ids || [];
    const updated = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    updateTask(editingTask.id, { assignee_ids: updated });
  };

  const priorityStyles = editingTask ? getPriorityBadgeColor(editingTask.priority) : { bg: "", text: "", border: "" };

  return (
    <AnimatePresence>
      {editingTask && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end"
          onClick={() => setEditingTask(null)}
        >
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-secondary/20">
          <div className="flex items-center space-x-3">
            {/* Project Pill */}
            {currentProject && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs font-medium text-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: currentProject.color }}
                />
                <span>{currentProject.name}</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground font-mono">
              #{editingTask.id.slice(-6)}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Duplicate button */}
            <button
              onClick={() => duplicateTask(editingTask.id)}
              title="Duplicate task"
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Delete button */}
            <button
              onClick={() => {
                confirm({
                  title: "Delete Task?",
                  message: `Are you sure you want to delete "${editingTask.title}"? This cannot be undone.`,
                  confirmText: "Delete Task",
                  variant: "danger",
                  onConfirm: () => {
                    deleteTask(editingTask.id);
                  },
                });
              }}
              title="Delete task"
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              onClick={() => setEditingTask(null)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title - Inline editable */}
          <div>
            <input
              type="text"
              value={editingTask.title}
              onChange={(e) => updateTask(editingTask.id, { title: e.target.value })}
              className="w-full text-xl font-bold bg-transparent text-foreground border-none outline-hidden focus:ring-1 focus:ring-primary/40 rounded-sm p-1 -ml-1 transition-all"
              placeholder="Task title..."
            />
          </div>

          {/* Core Properties Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/30 border border-border/60 text-xs">
            {/* Status Selector */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium flex items-center space-x-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Status</span>
              </label>
              <select
                value={editingTask.status}
                onChange={(e) => updateTask(editingTask.id, { status: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.status_key}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Priority</span>
              </label>
              <select
                value={editingTask.priority}
                onChange={(e) =>
                  updateTask(editingTask.id, { priority: e.target.value as PriorityLevel })
                }
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary capitalize"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Due Date Picker */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Due Date</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={editingTask.due_date || ""}
                  onChange={(e) => updateTask(editingTask.id, { due_date: e.target.value })}
                  className={`w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary ${
                    isTaskOverdue ? "border-red-500/50 text-red-500 font-semibold" : ""
                  }`}
                />
              </div>
              {isTaskOverdue && (
                <p className="text-[10px] text-red-500 font-medium">Overdue!</p>
              )}
            </div>

            {/* Time Tracking Widget */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time Tracked</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualTimeModalOpen(!isManualTimeModalOpen)}
                  className="text-[10px] text-primary hover:underline"
                >
                  + Manual Log
                </button>
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-mono font-medium">
                  {formatDuration(editingTask.tracked_seconds || 0)}
                  {editingTask.estimated_hours && (
                    <span className="text-muted-foreground text-[10px] ml-1">
                      / {editingTask.estimated_hours}h est
                    </span>
                  )}
                </div>
                {isTimerRunning ? (
                  <button
                    onClick={stopTimer}
                    title="Stop timer"
                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg text-xs font-medium flex items-center space-x-1"
                  >
                    <Square className="w-3 h-3 fill-red-600" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startTimer(editingTask.id)}
                    title="Start timer"
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-xs font-medium flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3 fill-emerald-600" />
                    <span>Start</span>
                  </button>
                )}
              </div>

              {/* Manual log mini dropdown */}
              {isManualTimeModalOpen && (
                <div className="p-2 bg-card border border-border rounded-lg shadow-lg mt-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs bg-secondary rounded border border-border"
                    />
                    <span className="text-[11px] text-muted-foreground">minutes</span>
                    <button
                      onClick={() => {
                        addManualTimeEntry(editingTask.id, manualMinutes);
                        setIsManualTimeModalOpen(false);
                      }}
                      className="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assignees multi-select pills */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assignees
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {users.map((u) => {
                const isAssigned = (editingTask.assignee_ids || []).includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => handleToggleAssignee(u.id)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                      isAssigned
                        ? "bg-primary text-primary-foreground font-medium shadow-xs"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <UserAvatar
                      name={u.full_name}
                      avatarUrl={u.avatar_url}
                      size="xs"
                      showStatus={false}
                    />
                    <span>{u.full_name}</span>
                    {isAssigned && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Labels / Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Labels & Tags
              </label>
              {!isAddingTag && (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="text-xs text-primary hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add tag</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(editingTask.labels || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs bg-secondary text-foreground border border-border"
                >
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted-foreground hover:text-foreground ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}

              {isAddingTag && (
                <form onSubmit={handleAddTag} className="flex items-center space-x-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Tag name..."
                    autoFocus
                    className="w-24 px-2 py-0.5 text-xs bg-background border border-primary rounded-md outline-hidden text-foreground"
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-md"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Description - Rich Markdown Text Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={4}
              value={editingTask.description}
              onChange={(e) => updateTask(editingTask.id, { description: e.target.value })}
              placeholder="Add detailed task description, acceptance criteria, markdown..."
              className="w-full bg-secondary/30 border border-border/80 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-background transition-all font-sans"
            />
          </div>

          {/* Subtasks / Checklist Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Subtasks & Checklist ({completedSubtasks}/{totalSubtasks})
                </h4>
              </div>
              {totalSubtasks > 0 && (
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  {subtaskProgress}%
                </span>
              )}
            </div>

            {/* Subtask Progress Bar */}
            {totalSubtasks > 0 && (
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            )}

            {/* Subtask Items */}
            <div className="space-y-1.5">
              {(editingTask.subtasks || []).map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40 hover:bg-secondary border border-border/40 transition-colors group"
                >
                  <label className="flex items-center space-x-2.5 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => toggleSubtask(editingTask.id, sub.id)}
                      className="w-4 h-4 rounded text-primary border-border focus:ring-primary/20 accent-primary"
                    />
                    <span
                      className={`text-xs ${
                        sub.completed ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {sub.title}
                    </span>
                  </label>
                  <button
                    onClick={() => deleteSubtask(editingTask.id, sub.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtask} className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add a new checklist subtask..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground rounded-lg text-xs font-medium transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Comments & Discussion Feed */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Discussion & Activity ({editingTask.comments?.length || 0})
              </h4>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {(editingTask.comments || []).map((comm) => (
                <div key={comm.id} className="p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserAvatar
                        name={comm.user?.full_name || "Team Member"}
                        avatarUrl={comm.user?.avatar_url}
                        size="xs"
                        showStatus={false}
                      />
                      <span className="text-xs font-semibold text-foreground">
                        {comm.user?.full_name || "Team Member"}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(comm.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap pl-7">
                    {comm.content}
                  </p>

                  {/* Comment reactions */}
                  <div className="flex items-center space-x-1.5 pl-7 pt-1">
                    {(comm.reactions || []).map((r) => {
                      const hasReacted = r.users.includes(currentUser.id);
                      return (
                        <button
                          key={r.emoji}
                          onClick={() => addCommentReaction(editingTask.id, comm.id, r.emoji)}
                          className={`px-2 py-0.5 rounded-full text-[11px] flex items-center space-x-1 border transition-colors ${
                            hasReacted
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-background border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.users.length}</span>
                        </button>
                      );
                    })}

                    {/* Quick emoji reaction buttons */}
                    <div className="flex items-center space-x-1 opacity-60 hover:opacity-100 transition-opacity">
                      {["👍", "❤️", "🚀", "🎉"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => addCommentReaction(editingTask.id, comm.id, emoji)}
                          className="hover:scale-125 text-xs p-0.5 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* New Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-start space-x-2 pt-2">
              <UserAvatar
                name={currentUser.full_name}
                avatarUrl={currentUser.avatar_url}
                size="sm"
                className="mt-1"
                showStatus={false}
              />
              <div className="flex-1 space-y-2">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment or mention @teammate..."
                  className="w-full bg-secondary/30 border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-background transition-all"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-xs font-medium rounded-lg shadow-sm transition-all"
                  >
                    Comment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
