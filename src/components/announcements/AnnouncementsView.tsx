"use client";

import { EmptyState } from "@/components/common/EmptyState";
import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  Megaphone,
  Plus,
  Pin,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Smile,
  X,
  MessageSquare,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";

export function AnnouncementsView() {
  const {
    announcements,
    createAnnouncement,
    markAnnouncementRead,
    addAnnouncementReaction,
    currentUser,
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"urgent" | "important" | "general">("general");
  const [isPinned, setIsPinned] = useState(false);

  const canCreate = ["owner", "admin", "project_manager"].includes(currentUser.role);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createAnnouncement(title.trim(), content.trim(), priority, isPinned);
    setTitle("");
    setContent("");
    setIsModalOpen(false);
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      case "important":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-bold text-foreground">Announcements Center</h2>
          <p className="text-xs text-muted-foreground">
            Official company updates, release notes, and operational bulletins
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-8">
        {announcements.length === 0 && <EmptyState icon={Megaphone} title="A home for the updates that matter" description={canCreate ? "Share your first announcement to keep the team informed and moving together." : "Team announcements will appear here when your workspace has something to share."} actionLabel={canCreate ? "Post announcement" : undefined} onAction={canCreate ? () => setIsModalOpen(true) : undefined} />}
        {announcements.map((ann) => {
          const isRead = ann.read_by.includes(currentUser.id);
          return (
            <div
              key={ann.id}
              className={`rounded-2xl border p-5 transition-all bg-card ${
                ann.is_pinned ? "border-amber-500/40 shadow-sm" : "border-border/80"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center space-x-3">
                  <UserAvatar
                    name={ann.author?.full_name || "Team Admin"}
                    avatarUrl={ann.author?.avatar_url}
                    size="sm"
                    className="ring-1 ring-border"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-foreground">
                        {ann.author?.full_name || "Team Admin"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        • {formatRelativeTime(ann.created_at)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {ann.author?.role.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {ann.is_pinned && (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                      <Pin className="w-3 h-3 fill-amber-500" />
                      <span>Pinned</span>
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getPriorityBadge(
                      ann.priority
                    )}`}
                  >
                    {ann.priority}
                  </span>
                </div>
              </div>

              {/* Title & Content */}
              <h3 className="text-sm font-bold text-foreground mb-2">{ann.title}</h3>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4">
                {ann.content}
              </p>

              {/* Footer: Reactions & Read status */}
              <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                {/* Reactions */}
                <div className="flex items-center space-x-1.5 flex-wrap">
                  {(ann.reactions || []).map((r) => {
                    const hasReacted = r.user_ids.includes(currentUser.id);
                    return (
                      <button
                        key={r.emoji}
                        onClick={() => addAnnouncementReaction(ann.id, r.emoji)}
                        className={`px-2.5 py-1 rounded-full text-xs flex items-center space-x-1.5 border transition-colors ${
                          hasReacted
                            ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                            : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span>{r.count}</span>
                      </button>
                    );
                  })}

                  {/* Add reaction buttons */}
                  <div className="flex items-center space-x-1 opacity-70 hover:opacity-100 transition-opacity">
                    {["🎉", "🚀", "❤️", "👀", "👏"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addAnnouncementReaction(ann.id, emoji)}
                        className="hover:scale-125 text-xs p-1 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mark as read button */}
                <div>
                  {!isRead ? (
                    <button
                      onClick={() => markAnnouncementRead(ann.id)}
                      className="px-2.5 py-1 text-xs text-primary font-medium hover:underline flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as read</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Read</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Announcement Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in cursor-pointer"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[88vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground animate-in zoom-in-95 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30 shrink-0">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  New Workspace Announcement
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 All-Hands Meeting & Release 3.0"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as "urgent" | "important" | "general")
                    }
                    className="w-full bg-secondary/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground capitalize"
                  >
                    <option value="general">General</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span className="text-xs font-medium text-foreground">
                      Pin to top of feed
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Message Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write the full message details..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 px-5 py-3 border-t border-border bg-secondary/20 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !content.trim()}
                className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                Publish Announcement
              </button>
            </div>
          </form>
        </div>
        </div>
      )}
    </div>
  );
}
