"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { X, Plus, FolderKanban, Calendar, AlertCircle, Palette } from "lucide-react";
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

  if (!isCreateProjectModalOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Create New Project</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
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
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Description</label>
            <textarea
              rows={3}
              placeholder="Project purpose, target milestones, objectives..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Color Palette Picker */}
          <div className="space-y-1.5">
            <label className="font-medium text-muted-foreground flex items-center space-x-1">
              <Palette className="w-3.5 h-3.5" />
              <span>Project Color</span>
            </label>
            <div className="flex items-center space-x-2">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${
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
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground capitalize"
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
                <span>Target Deadline</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
              />
            </div>
          </div>

          {/* Assign Team Members */}
          <div className="space-y-1.5">
            <label className="font-medium text-muted-foreground">Team Members</label>
            <div className="flex flex-wrap gap-1.5">
              {users.map((u) => {
                const isSelected = memberIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
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

          <div className="flex justify-end space-x-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
