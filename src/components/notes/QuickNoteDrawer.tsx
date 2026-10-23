"use client";

import React, { useState, useEffect } from "react";
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
  Plus,
} from "lucide-react";
import { STICKY_COLORS, getStickyColorTheme } from "./NotesView";

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
  const [newColor, setNewColor] = useState("yellow");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    const startNewNote = () => setIsCreatingNew(true);
    window.addEventListener("vinzflow:new-note", startNewNote);
    return () => window.removeEventListener("vinzflow:new-note", startNewNote);
  }, []);

  const currentNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = createNote({
      title: newTitle.trim(),
      content: newContent,
      color: newColor,
      tags: ["Scratchpad"],
    });
    setActiveNoteId(created.id);
    setNewTitle("");
    setNewContent("");
    setIsCreatingNew(false);
    toast.success("Sticky Note Saved", "Added to your scratchpad notes.");
  };

  const handleConvertToTask = () => {
    if (!currentNote) return;
    const targetProjId = currentNote.project_id || projects[0]?.id || "proj_mobile";
    convertNoteToTask(currentNote.id, targetProjId);
    toast.success("Converted to Task", `Note "${currentNote.title}" converted to task!`);
  };

  // Keyboard shortcut: Escape to close drawer
  useEffect(() => {
    if (!isQuickNoteOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsQuickNoteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuickNoteOpen, setIsQuickNoteOpen]);

  const currentTheme = getStickyColorTheme(
    isCreatingNew ? newColor : currentNote?.color || "yellow"
  );

  return (
    <AnimatePresence>
      {isQuickNoteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end cursor-pointer"
          onClick={() => setIsQuickNoteOpen(false)}
        >
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className={`w-full max-w-lg h-full flex flex-col shadow-2xl text-foreground cursor-default border-l border-border/80 ${currentTheme.lightBg} ${currentTheme.lightText} ${currentTheme.darkBg} ${currentTheme.darkText}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Scotch Tape Detail */}
            <div
              className={`w-24 h-4 ${currentTheme.tapeBg} backdrop-blur-xs border border-white/50 rounded-xs shadow-2xs mx-auto mt-2 rotate-[-1deg]`}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 dark:border-white/10 shrink-0">
              <div className="flex items-center space-x-2">
                <StickyNote className="w-4 h-4" />
                <h3 className="text-sm font-bold">Sticky Scratchpad</h3>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-black/10 dark:bg-white/15 hover:bg-black/15 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Note</span>
                </button>
                <button
                  onClick={() => setIsQuickNoteOpen(false)}
                  className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Notes Tab Strip */}
            <div className="flex items-center space-x-1.5 px-4 py-2 border-b border-black/10 dark:border-white/10 overflow-x-auto bg-black/5 dark:bg-black/20 shrink-0">
              {notes.map((n) => {
                const isSelected = n.id === currentNote?.id && !isCreatingNew;
                const tabTheme = getStickyColorTheme(n.color);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setActiveNoteId(n.id);
                      setIsCreatingNew(false);
                    }}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? "bg-black/15 dark:bg-white/20 font-bold shadow-2xs ring-1 ring-black/20"
                        : "opacity-70 hover:opacity-100 hover:bg-black/5"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${tabTheme.dot}`} />
                    {n.is_pinned && <Pin className="w-3 h-3 fill-current text-amber-500" />}
                    <span className="truncate max-w-[110px]">{n.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col space-y-3.5">
              {isCreatingNew ? (
                <form onSubmit={handleSaveNew} className="flex-1 flex flex-col space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase opacity-80">Choose Color</span>
                    <div className="flex items-center space-x-1.5">
                      {STICKY_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewColor(c.id)}
                          className={`w-4 h-4 rounded-full ${c.dot} transition-transform ${
                            newColor === c.id
                              ? "ring-2 ring-primary ring-offset-1 scale-110"
                              : "opacity-70 hover:scale-110"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Sticky Note Title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-base font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-1 outline-hidden placeholder:opacity-50"
                    autoFocus
                  />
                  <textarea
                    placeholder="Jot down quick thoughts, checklists, meeting notes..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="flex-1 w-full bg-transparent border-none outline-hidden resize-none text-xs leading-relaxed font-sans placeholder:opacity-50"
                  />

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-black/10 dark:border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-3 py-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      Stick Note
                    </button>
                  </div>
                </form>
              ) : currentNote ? (
                <div className="flex-1 flex flex-col space-y-3.5">
                  {/* Color Switcher Strip */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center space-x-1.5">
                      {STICKY_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updateNote(currentNote.id, { color: c.id })}
                          title={`Change to ${c.name}`}
                          className={`w-4 h-4 rounded-full ${c.dot} transition-transform ${
                            (currentNote.color || "yellow") === c.id
                              ? "ring-2 ring-primary ring-offset-1 scale-110"
                              : "opacity-70 hover:scale-110"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => togglePinNote(currentNote.id)}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title={currentNote.is_pinned ? "Unpin note" : "Pin note"}
                      >
                        <Pin
                          className={`w-3.5 h-3.5 ${
                            currentNote.is_pinned ? "fill-current text-amber-500" : "opacity-60"
                          }`}
                        />
                      </button>
                      <button
                        onClick={handleConvertToTask}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title="Convert to project task"
                      >
                        <CheckSquare className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                      </button>
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
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Content Editing */}
                  <input
                    type="text"
                    value={currentNote.title}
                    onChange={(e) => updateNote(currentNote.id, { title: e.target.value })}
                    className="w-full text-base font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-1 outline-hidden placeholder:opacity-50"
                  />
                  <textarea
                    value={currentNote.content}
                    onChange={(e) => updateNote(currentNote.id, { content: e.target.value })}
                    className="flex-1 w-full bg-transparent border-none outline-hidden resize-none text-xs leading-relaxed font-sans placeholder:opacity-50 min-h-[300px]"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-60 text-xs">
                  <StickyNote className="w-10 h-10 mb-2 opacity-40" />
                  <p>No note selected. Click "+ New Note" to start.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
