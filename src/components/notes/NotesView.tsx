"use client";

import { EmptyState } from "@/components/common/EmptyState";
import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm, useToast } from "@/context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote,
  Plus,
  Pin,
  Trash2,
  CheckSquare,
  Search,
  Tag,
  Clock,
  Sparkles,
  Share2,
  X,
  Edit2,
  Check,
  FolderKanban,
  Maximize2,
  LayoutGrid,
  Filter,
} from "lucide-react";
import { Note } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

// Authentic Sticky Note Palette
export const STICKY_COLORS = [
  {
    id: "yellow",
    name: "Canary Yellow",
    dot: "bg-amber-400",
    lightBg: "bg-[#fef9c3]",
    lightBorder: "border-[#fde047]",
    lightText: "text-[#713f12]",
    darkBg: "dark:bg-amber-950/35",
    darkBorder: "dark:border-amber-600/40",
    darkText: "dark:text-amber-100",
    tapeBg: "bg-amber-200/50 dark:bg-amber-400/20",
  },
  {
    id: "green",
    name: "Mint Green",
    dot: "bg-emerald-400",
    lightBg: "bg-[#dcfce7]",
    lightBorder: "border-[#86efac]",
    lightText: "text-[#14532d]",
    darkBg: "dark:bg-emerald-950/35",
    darkBorder: "dark:border-emerald-600/40",
    darkText: "dark:text-emerald-100",
    tapeBg: "bg-emerald-200/50 dark:bg-emerald-400/20",
  },
  {
    id: "blue",
    name: "Sky Blue",
    dot: "bg-sky-400",
    lightBg: "bg-[#e0f2fe]",
    lightBorder: "border-[#7dd3fc]",
    lightText: "text-[#0c4a6e]",
    darkBg: "dark:bg-sky-950/35",
    darkBorder: "dark:border-sky-600/40",
    darkText: "dark:text-sky-100",
    tapeBg: "bg-sky-200/50 dark:bg-sky-400/20",
  },
  {
    id: "pink",
    name: "Blossom Pink",
    dot: "bg-rose-400",
    lightBg: "bg-[#ffe4e6]",
    lightBorder: "border-[#fecdd3]",
    lightText: "text-[#881337]",
    darkBg: "dark:bg-rose-950/35",
    darkBorder: "dark:border-rose-600/40",
    darkText: "dark:text-rose-100",
    tapeBg: "bg-rose-200/50 dark:bg-rose-400/20",
  },
  {
    id: "purple",
    name: "Lavender Purple",
    dot: "bg-purple-400",
    lightBg: "bg-[#f3e8ff]",
    lightBorder: "border-[#d8b4fe]",
    lightText: "text-[#581c87]",
    darkBg: "dark:bg-purple-950/35",
    darkBorder: "dark:border-purple-600/40",
    darkText: "dark:text-purple-100",
    tapeBg: "bg-purple-200/50 dark:bg-purple-400/20",
  },
  {
    id: "orange",
    name: "Warm Peach",
    dot: "bg-orange-400",
    lightBg: "bg-[#ffedd5]",
    lightBorder: "border-[#fed7aa]",
    lightText: "text-[#7c2d12]",
    darkBg: "dark:bg-orange-950/35",
    darkBorder: "dark:border-orange-600/40",
    darkText: "dark:text-orange-100",
    tapeBg: "bg-orange-200/50 dark:bg-orange-400/20",
  },
];

export function getStickyColorTheme(colorId?: string) {
  return STICKY_COLORS.find((c) => c.id === colorId) || STICKY_COLORS[0];
}

export function NotesView() {
  const confirm = useConfirm();
  const toast = useToast();
  const {
    notes,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    convertNoteToTask,
    projects,
  } = useStore();

  const [search, setSearch] = useState("");
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>("all");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  // Filter notes by search & color
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesColor =
      selectedColorFilter === "all" || (n.color || "yellow") === selectedColorFilter;

    return matchesSearch && matchesColor;
  });

  // Sort pinned notes to the front
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const handleCreateStickyNote = (color: string = "yellow") => {
    const created = createNote({
      title: "New Sticky Note",
      content: "Type your quick idea, meeting note, or to-do checklist here...",
      color,
      tags: ["Brainstorm"],
    });
    if (!created) return;
    setEditingNote(created);
    toast.success("Sticky Note Added", "New sticky note pinned to your board.");
  };

  const handleConvertToTask = (note: Note) => {
    const targetProjId = note.project_id || projects[0]?.id || "proj_mobile";
    convertNoteToTask(note.id, targetProjId);
    toast.success("Converted to Task", `Sticky note "${note.title}" converted to project task!`);
  };

  const handleDelete = (note: Note) => {
    confirm({
      title: "Remove Sticky Note?",
      message: `Are you sure you want to delete "${note.title}"? This cannot be undone.`,
      confirmText: "Delete Note",
      variant: "danger",
      onConfirm: () => {
        deleteNote(note.id);
        if (editingNote?.id === note.id) {
          setEditingNote(null);
        }
      },
    });
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* Top Header & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-amber-950 flex items-center justify-center shadow-sm">
            <StickyNote className="w-5 h-5 fill-amber-950/20" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-foreground">Sticky Notes & Ideas Wall</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {notes.length} Notes
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tactile corkboard for brainstorming, sprint retros, meeting notes & rapid ideas
            </p>
          </div>
        </div>

        {/* Action Buttons & Quick Create */}
        <div className="flex items-center space-x-2">
          {/* Quick Color Pickers for New Sticky Note */}
          <div className="hidden sm:flex items-center space-x-1.5 p-1 bg-secondary/40 rounded-xl border border-border/60">
            {STICKY_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCreateStickyNote(c.id)}
                title={`Add new ${c.name} sticky note`}
                className={`w-6 h-6 rounded-lg ${c.dot} hover:scale-110 active:scale-95 transition-transform flex items-center justify-center shadow-2xs cursor-pointer`}
              >
                <Plus className="w-3 h-3 text-black/60" />
              </button>
            ))}
          </div>

          <button
            onClick={() => handleCreateStickyNote("yellow")}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Secondary Controls: Search & Color Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Color Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedColorFilter("all")}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedColorFilter === "all"
                ? "bg-secondary text-foreground border border-border shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            All Notes ({notes.length})
          </button>

          {STICKY_COLORS.map((c) => {
            const count = notes.filter((n) => (n.color || "yellow") === c.id).length;
            const isSelected = selectedColorFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedColorFilter(c.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-secondary text-foreground font-bold border border-border shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span>{c.name}</span>
                <span className="text-[10px] text-muted-foreground/80 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sticky notes & tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Corkboard Wall Grid */}
      <div className="flex-1 overflow-y-auto pr-1 pb-10">
        {sortedNotes.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={search || selectedColorFilter !== "all" ? "No notes match your filters" : "Good ideas start here"}
            description={search || selectedColorFilter !== "all" ? "Clear your search and color filter to see all your notes." : "Capture your first idea, meeting note, or reminder. Keep it close to the work that matters."}
            actionLabel={search || selectedColorFilter !== "all" ? "Clear filters" : "Create a note"}
            onAction={() => {
              if (search || selectedColorFilter !== "all") { setSearch(""); setSelectedColorFilter("all"); }
              else handleCreateStickyNote("yellow");
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {sortedNotes.map((note, index) => {
              const theme = getStickyColorTheme(note.color);
              // Slight organic rotation for authentic sticky paper feel
              const rotations = ["-rotate-[0.8deg]", "rotate-[0.6deg]", "-rotate-[0.4deg]", "rotate-[0.9deg]", "-rotate-[0.6deg]"];
              const rotationClass = rotations[index % rotations.length];

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl border ${theme.lightBg} ${theme.lightBorder} ${theme.lightText} ${theme.darkBg} ${theme.darkBorder} ${theme.darkText} shadow-md hover:shadow-xl hover:scale-[1.02] hover:rotate-0 transition-all duration-200 cursor-pointer ${rotationClass} min-h-[220px]`}
                  onClick={() => setEditingNote(note)}
                >
                  {/* Top Scotch Tape Simulation */}
                  <div
                    className={`w-14 h-3.5 ${theme.tapeBg} backdrop-blur-xs border border-white/40 dark:border-white/20 rounded-xs shadow-2xs mx-auto -mt-6 mb-2 rotate-[-1deg] pointer-events-none`}
                  />

                  {/* Header: Title & Pin Indicator */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-sm leading-snug line-clamp-2">
                        {note.title || "Untitled Note"}
                      </h3>
                      {note.is_pinned && (
                        <span
                          title="Pinned Note"
                          className="p-1 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/40 shrink-0"
                        >
                          <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        </span>
                      )}
                    </div>

                    {/* Note Content Preview */}
                    <p className="text-xs opacity-90 line-clamp-4 leading-relaxed font-sans whitespace-pre-wrap">
                      {note.content || "Empty note. Click to add details..."}
                    </p>
                  </div>

                  {/* Footer: Tags, Color Palette Switcher & Actions */}
                  <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 space-y-2.5">
                    {/* Tags */}
                    {(note.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-80"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div
                      className="flex items-center justify-between pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Color Picker dots */}
                      <div className="flex items-center space-x-1">
                        {STICKY_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => updateNote(note.id, { color: c.id })}
                            title={`Change to ${c.name}`}
                            className={`w-3.5 h-3.5 rounded-full ${c.dot} transition-transform cursor-pointer ${
                              (note.color || "yellow") === c.id
                                ? "ring-2 ring-primary ring-offset-1 scale-110"
                                : "hover:scale-125 opacity-70 hover:opacity-100"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Utility Action Buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => togglePinNote(note.id)}
                          title={note.is_pinned ? "Unpin note" : "Pin note to top"}
                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <Pin
                            className={`w-3.5 h-3.5 ${
                              note.is_pinned ? "fill-current" : "opacity-60"
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConvertToTask(note)}
                          title="Convert note to project task"
                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note)}
                          title="Delete sticky note"
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Focused Sticky Note Editor Modal */}
      <AnimatePresence>
        {editingNote && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={() => setEditingNote(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 28, stiffness: 400 }}
              className={`w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden cursor-default ${
                getStickyColorTheme(editingNote.color).lightBg
              } ${getStickyColorTheme(editingNote.color).lightBorder} ${
                getStickyColorTheme(editingNote.color).lightText
              } ${getStickyColorTheme(editingNote.color).darkBg} ${
                getStickyColorTheme(editingNote.color).darkBorder
              } ${getStickyColorTheme(editingNote.color).darkText}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Scotch Tape Decor */}
              <div
                className={`w-20 h-4 ${
                  getStickyColorTheme(editingNote.color).tapeBg
                } backdrop-blur-xs border border-white/50 rounded-xs shadow-2xs mx-auto -mt-2 mb-1 rotate-[-1deg]`}
              />

              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-black/10 dark:border-white/10 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Sticky Note Editor
                  </span>
                  <div className="flex items-center space-x-1 pl-2">
                    {STICKY_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          updateNote(editingNote.id, { color: c.id });
                          setEditingNote({ ...editingNote, color: c.id });
                        }}
                        className={`w-4 h-4 rounded-full ${c.dot} transition-transform ${
                          (editingNote.color || "yellow") === c.id
                            ? "ring-2 ring-primary ring-offset-1 scale-110"
                            : "hover:scale-125 opacity-70"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      togglePinNote(editingNote.id);
                      setEditingNote({ ...editingNote, is_pinned: !editingNote.is_pinned });
                    }}
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title={editingNote.is_pinned ? "Unpin note" : "Pin note"}
                  >
                    <Pin
                      className={`w-4 h-4 ${
                        editingNote.is_pinned ? "fill-current text-amber-500" : "opacity-60"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setEditingNote(null)}
                    className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Scrollable Note Area */}
              <div className="p-5 space-y-3.5 flex-1 overflow-y-auto">
                {/* Note Title Input */}
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    updateNote(editingNote.id, { title });
                    setEditingNote({ ...editingNote, title });
                  }}
                  placeholder="Note Title..."
                  className="w-full text-lg font-bold bg-transparent border-b border-black/10 dark:border-white/10 pb-1 outline-hidden placeholder:opacity-50"
                  autoFocus
                />

                {/* Note Content Textarea */}
                <textarea
                  value={editingNote.content}
                  onChange={(e) => {
                    const content = e.target.value;
                    updateNote(editingNote.id, { content });
                    setEditingNote({ ...editingNote, content });
                  }}
                  placeholder="Jot down notes, checklists, architectural ideas, or meeting takeaways..."
                  rows={9}
                  className="w-full bg-transparent border-none outline-hidden resize-none text-xs leading-relaxed font-sans placeholder:opacity-50"
                />

                {/* Tags Management */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center space-x-1 opacity-80">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Tags</span>
                    </span>
                    <span className="text-[10px] opacity-70">
                      Updated {formatRelativeTime(editingNote.updated_at)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(editingNote.tags || []).map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/10 dark:bg-white/15"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = (editingNote.tags || []).filter((_, idx) => idx !== i);
                            updateNote(editingNote.id, { tags: newTags });
                            setEditingNote({ ...editingNote, tags: newTags });
                          }}
                          className="opacity-60 hover:opacity-100 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    <input
                      type="text"
                      placeholder="+ Add tag (Press Enter)"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTagInput.trim()) {
                          e.preventDefault();
                          const newTags = [...(editingNote.tags || []), newTagInput.trim()];
                          updateNote(editingNote.id, { tags: newTags });
                          setEditingNote({ ...editingNote, tags: newTags });
                          setNewTagInput("");
                        }
                      }}
                      className="px-2.5 py-0.5 text-xs bg-black/5 dark:bg-white/10 rounded-full border border-black/10 dark:border-white/20 outline-hidden placeholder:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="px-5 py-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-black/5 dark:bg-black/20">
                <button
                  type="button"
                  onClick={() => handleDelete(editingNote)}
                  className="flex items-center space-x-1 text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleConvertToTask(editingNote);
                      setEditingNote(null);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/15 hover:bg-black/15 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Convert to Task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingNote(null)}
                    className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
