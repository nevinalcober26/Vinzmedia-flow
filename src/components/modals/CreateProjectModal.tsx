"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, FolderKanban, Calendar, AlertCircle, Palette, Check } from "lucide-react";
import { PriorityLevel, ProjectStatus } from "@/types";

export function CreateProjectModal() {
  const {
    isCreateProjectModalOpen,
    setIsCreateProjectModalOpen,
    createProject,
    users,
    currentUser,
    setSelectedProjectId,
  } = useStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [priority, setPriority] = useState<PriorityLevel>("high");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [targetDate, setTargetDate] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([currentUser.id]);

  const handleClose = () => {
    setIsCreateProjectModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProj = createProject({
      name: name.trim(),
      description: description.trim(),
      color,
      priority,
      status,
      target_date: targetDate || undefined,
      member_ids: memberIds,
    });

    if (newProj) {
      setSelectedProjectId(newProj.id);
      setName("");
      setDescription("");
      handleClose();
    }
  };

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const colorPalette = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#ef4444", // Red
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
  ];

  return (
    <AnimatePresence>
      {isCreateProjectModalOpen && (
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
                <FolderKanban className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Create New Project</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Project Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Mobile App Redesign v3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Project purpose, target milestones, objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none transition-all"
                />
              </div>

              {/* Color Palette Picker */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground flex items-center space-x-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Theme Accent Color</span>
                </label>
                <div className="flex items-center space-x-2.5">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        color === c ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:scale-110"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Priority & Target Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Priority</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground cursor-pointer"
                  >
                    <option value="urgent">🔴 Urgent — High organizational priority</option>
                    <option value="high">🟠 High — Core sprint project</option>
                    <option value="medium">🟡 Medium — Regular development</option>
                    <option value="low">🟢 Low — Experimental / Backlog</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Target Deadline</span>
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground cursor-pointer"
                  />
                </div>
              </div>

              {/* Assign Team Members */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground">Assigned Project Members</label>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => {
                    const isSelected = memberIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMember(u.id)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
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

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
