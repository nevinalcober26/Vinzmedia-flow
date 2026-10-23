"use client";

import React from "react";
import { X, Command as CommandIcon } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function KeyboardShortcutsModal({ onClose }: Props) {
  const shortcutGroups = [
    {
      title: "General & Navigation",
      shortcuts: [
        { key: "⌘ / Ctrl + K", description: "Open Command Palette & Global Search" },
        { key: "?", description: "Open Keyboard Shortcuts cheat sheet" },
        { key: "Esc", description: "Close active modal, drawer, or dropdown" },
      ],
    },
    {
      title: "Task & Project Actions",
      shortcuts: [
        { key: "N", description: "Quick new task" },
        { key: "P", description: "Create new project" },
        { key: "Q", description: "Open Quick Note scratchpad" },
      ],
    },
    {
      title: "Views & Layout",
      shortcuts: [
        { key: "1", description: "Switch to Kanban Board view" },
        { key: "2", description: "Switch to List / Table view" },
        { key: "3", description: "Switch to Calendar view" },
        { key: "4", description: "Switch to Timeline / Gantt view" },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center space-x-2">
            <CommandIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h4>
              <div className="space-y-1.5">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.description}
                    className="flex items-center justify-between py-1 text-xs"
                  >
                    <span className="text-foreground/90">{sc.description}</span>
                    <kbd className="px-2 py-0.5 text-[11px] font-mono font-medium text-foreground bg-secondary border border-border rounded shadow-2xs">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
