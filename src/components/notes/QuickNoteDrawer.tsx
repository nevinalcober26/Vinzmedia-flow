"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Pin,
  Trash2,
  CheckSquare,
  Sparkles,
  Save,
  Tag,
  StickyNote,
  ChevronRight,
} from "lucide-react";

export function QuickNoteDrawer() {
  const confirm = useConfirm();
  const toast = useToast();
  const {
    isQuickNoteOpen,
    setIsQuickNoteOpen,
    notes,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    convertNoteToTask,
    projects,
  } = useStore();

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || "");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const currentNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = createNote({
      title: newTitle.trim(),
      content: newContent,
    });
    setActiveNoteId(created.id);
    setNewTitle("");
    setNewContent("");
    setIsCreatingNew(false);
  };

  const handleConvertToTask = () => {
    if (!currentNote) return;
    const targetProjId = currentNote.project_id || projects[0]?.id || "proj_mobile";
    convertNoteToTask(currentNote.id, targetProjId);
    toast.success("Converted to Task", `Note "${currentNote.title}" converted to task!`);
  };

  return (
    <AnimatePresence>
      {isQuickNoteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
          onClick={() => setIsQuickNoteOpen(false)}
        >
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/20">
          <div className="flex items-center space-x-2">
            <StickyNote className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Quick Notes & Scratchpad
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCreatingNew(true)}
              className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              + New Note
            </button>
            <button
              onClick={() => setIsQuickNoteOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notes Tabs List */}
        <div className="flex items-center space-x-1.5 px-6 py-2.5 border-b border-border/60 overflow-x-auto bg-secondary/10">
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setActiveNoteId(n.id);
                setIsCreatingNew(false);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                n.id === currentNote?.id && !isCreatingNew
                  ? "bg-secondary text-foreground font-semibold border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {n.is_pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
              <span className="truncate max-w-[120px]">{n.title}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-4">
          {isCreatingNew ? (
            <form onSubmit={handleSaveNew} className="flex-1 flex flex-col space-y-4">
              <input
                type="text"
                placeholder="Note Title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="text-lg font-bold bg-transparent border-none outline-hidden text-foreground placeholder:text-muted-foreground"
              />
              <textarea
                placeholder="Write rich notes, meeting memos, checklist items..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="flex-1 w-full bg-secondary/30 border border-border rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </form>
          ) : currentNote ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Note Action Toolbar */}
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePinNote(currentNote.id)}
                    title={currentNote.is_pinned ? "Unpin note" : "Pin note to top"}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      currentNote.is_pinned
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleConvertToTask}
                    title="Convert this note into a task"
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-border hover:bg-secondary text-xs text-foreground font-medium transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    <span>Convert to Task</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    confirm({
                      title: "Delete Note?",
                      message: `Are you sure you want to delete "${currentNote.title}"?`,
                      confirmText: "Delete Note",
                      variant: "danger",
                      onConfirm: () => {
                        deleteNote(currentNote.id);
                      },
                    });
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Title inline */}
              <input
                type="text"
                value={currentNote.title}
                onChange={(e) => updateNote(currentNote.id, { title: e.target.value })}
                className="text-lg font-bold bg-transparent border-none outline-hidden text-foreground"
              />

              {/* Content inline with autosave */}
              <textarea
                value={currentNote.content}
                onChange={(e) => updateNote(currentNote.id, { content: e.target.value })}
                className="flex-1 w-full bg-secondary/30 border border-border/80 rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-background transition-all font-sans leading-relaxed"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs">
              <StickyNote className="w-10 h-10 opacity-30 mb-2" />
              <p>No notes created yet</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
