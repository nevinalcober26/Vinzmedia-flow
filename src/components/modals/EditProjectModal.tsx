"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import {
  X,
  FolderKanban,
  Calendar,
  AlertCircle,
  Palette,
  Check,
  Globe,
  Lock,
  Users,
  Building2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Project, PriorityLevel, ProjectStatus } from "@/types";
import { ClientAvatar } from "@/components/common/ClientAvatar";
import { UserAvatar } from "@/components/common/UserAvatar";

const COLOR_OPTIONS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#0073ea", // Vinz Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
  const { updateProject, clients, users, currentUser } = useStore();
  const toast = useToast();

  const [name, setName] = useState(project.name || "");
  const [description, setDescription] = useState(project.description || "");
  const [color, setColor] = useState(project.color || "#6366f1");
  const [priority, setPriority] = useState<PriorityLevel>(project.priority || "high");
  const [status, setStatus] = useState<ProjectStatus>(project.status || "active");
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [targetDate, setTargetDate] = useState(project.target_date || "");
  const [selectedClientId, setSelectedClientId] = useState<string>(project.client_id || "");
  const [accessScope, setAccessScope] = useState<"all" | "specific">(
    project.all_members !== false ? "all" : "specific"
  );
  const [memberIds, setMemberIds] = useState<string[]>(
    project.member_ids?.length ? project.member_ids : [currentUser.id]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(project.name || "");
      setDescription(project.description || "");
      setColor(project.color || "#6366f1");
      setPriority(project.priority || "high");
      setStatus(project.status || "active");
      setStartDate(project.start_date ? project.start_date.split("T")[0] : "");
      setTargetDate(project.target_date ? project.target_date.split("T")[0] : "");
      setSelectedClientId(project.client_id || "");
      setAccessScope(project.all_members !== false ? "all" : "specific");
      setMemberIds(project.member_ids?.length ? project.member_ids : [currentUser.id]);
    }
  }, [isOpen, project, currentUser.id]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const toggleMember = (userId: string) => {
    if (memberIds.includes(userId)) {
      if (memberIds.length === 1) {
        toast.warning("Cannot remove all members", "At least one member must remain assigned.");
        return;
      }
      setMemberIds(memberIds.filter((id) => id !== userId));
    } else {
      setMemberIds([...memberIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Name Required", "Please enter a project name.");
      return;
    }

    setIsSubmitting(true);
    try {
      updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        color,
        priority,
        status,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        client_id: selectedClientId || null,
        all_members: accessScope === "all",
        member_ids: accessScope === "all" ? users.map((u) => u.id) : memberIds,
      });

      toast.success("Project Updated", `Updated details for "${name.trim()}".`);
      onClose();
    } catch (err: any) {
      toast.error("Update Failed", err?.message || "Failed to update project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-secondary/30 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${color}25`, color }}
            >
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                Edit Workstream
              </h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Project Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Workstream Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the workstream scope and deliverables..."
              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Status & Priority Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground cursor-pointer font-medium"
              >
                <option value="active">Active</option>
                <option value="planning">Planning</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground cursor-pointer font-medium"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Target Delivery Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer font-medium"
              />
            </div>
          </div>

          {/* Linked Client */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Linked Client</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground cursor-pointer font-medium"
            >
              <option value="">🏢 Internal Project (No Client)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} — ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color Swatches */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center space-x-1">
              <Palette className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Accent Color</span>
            </label>
            <div className="flex items-center space-x-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                    color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Access Scope & Assigned Members */}
          <div className="space-y-1.5 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Team Access Scope</span>
              </label>
              <div className="flex items-center space-x-1 bg-secondary/50 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setAccessScope("all")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    accessScope === "all" ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Members
                </button>
                <button
                  type="button"
                  onClick={() => setAccessScope("specific")}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    accessScope === "specific" ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Specific Team
                </button>
              </div>
            </div>

            {accessScope === "specific" && (
              <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/60 max-h-36 overflow-y-auto space-y-1 animate-in fade-in">
                {users.map((u) => {
                  const isAssigned = memberIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleMember(u.id)}
                      className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isAssigned ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <UserAvatar user={u} size="xs" />
                        <span className="truncate">{u.full_name}</span>
                      </div>
                      {isAssigned && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-4 py-2.5 border-t border-border/70 bg-secondary/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
