"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
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
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export function NotesView() {
  const {
    notes,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    convertNoteToTask,
    projects,
  } = useStore();

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || "");
  const [search, setSearch] = useState("");

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const otherNotes = filteredNotes.filter((n) => !n.is_pinned);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handleCreateNewNote = () => {
    const created = createNote({
      title: "Untitled Note",
      content: "",
      tags: ["Workspace"],
    });
    setActiveNoteId(created.id);
  };

  const handleConvertToTask = () => {
    if (!activeNote) return;
    const targetProjId = activeNote.project_id || projects[0]?.id || "proj_mobile";
    convertNoteToTask(activeNote.id, targetProjId);
    alert(`Converted note "${activeNote.title}" to a task!`);
  };

  return (
    <div className="flex h-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
      {/* Left Sidebar: Notes Navigator */}
      <div className="w-72 border-r border-border/60 bg-secondary/20 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StickyNote className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Notes & Docs</span>
          </div>
          <button
            onClick={handleCreateNewNote}
            className="p-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            title="Create note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-border/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pinned
              </p>
              {pinnedNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all ${
                    note.id === activeNote?.id
                      ? "bg-secondary text-foreground font-semibold shadow-xs border border-border"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate flex-1">{note.title}</span>
                    <Pin className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0 ml-1" />
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{note.content}</p>
                </button>
              ))}
            </div>
          )}

          {/* All Notes Section */}
          <div className="space-y-1">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              All Notes ({otherNotes.length})
            </p>
            {otherNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all ${
                  note.id === activeNote?.id
                    ? "bg-secondary text-foreground font-semibold shadow-xs border border-border"
                    : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold truncate flex-1">{note.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{note.content}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Content Editor */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {activeNote ? (
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Updated {formatRelativeTime(activeNote.updated_at)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => togglePinNote(activeNote.id)}
                  title={activeNote.is_pinned ? "Unpin" : "Pin"}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    activeNote.is_pinned
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Pin className="w-4 h-4" />
                </button>

                <button
                  onClick={handleConvertToTask}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs text-foreground font-medium transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Convert to Task</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm("Delete this note?")) {
                      deleteNote(activeNote.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Title */}
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
              className="text-2xl font-bold bg-transparent border-none outline-hidden text-foreground placeholder:text-muted-foreground"
              placeholder="Note Title..."
            />

            {/* Tags Row */}
            <div className="flex items-center space-x-2 text-xs">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <div className="flex items-center space-x-1">
                {(activeNote.tags || []).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Note Editor Area */}
            <textarea
              value={activeNote.content}
              onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
              placeholder="Start typing notes, meeting minutes, architecture diagrams..."
              className="flex-1 w-full bg-transparent border-none outline-hidden resize-none text-sm text-foreground placeholder:text-muted-foreground/60 leading-relaxed font-sans min-h-[400px]"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs">
            <StickyNote className="w-12 h-12 opacity-30 mb-2" />
            <p>Select or create a note to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
}
