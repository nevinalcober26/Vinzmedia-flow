"use client";

import React, { useState, useRef, useEffect } from "react";
import { DEFAULT_TASK_TYPES, getTaskTypeBadge } from "@/lib/taskTypes";
import { Plus, Check, ChevronDown } from "lucide-react";

interface MondayTaskTypeCellProps {
  taskType?: string;
  onChange: (newType: string) => void;
  availableTypes?: string[];
}

export function MondayTaskTypeCell({
  taskType = "Development",
  onChange,
  availableTypes,
}: MondayTaskTypeCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const badge = getTaskTypeBadge(taskType);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTypeName.trim()) {
      onChange(newTypeName.trim());
      setNewTypeName("");
      setIsAddingNew(false);
      setIsOpen(false);
    }
  };

  // Combine default types with any custom types from availableTypes
  const customTypes = (availableTypes || []).filter(
    (t) => !DEFAULT_TASK_TYPES.some((d) => d.id.toLowerCase() === t.toLowerCase() || d.name.toLowerCase() === t.toLowerCase())
  );

  return (
    <div className="relative inline-block w-full text-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${badge.bg} ${badge.text} ${badge.border} hover:opacity-90 shadow-2xs`}
        title={`Task Type: ${badge.name}`}
      >
        <div className="flex items-center space-x-1.5 truncate">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: badge.color }}
          />
          <span className="truncate">{badge.name}</span>
        </div>
        <ChevronDown className="w-3 h-3 ml-1 opacity-60 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-card border border-border shadow-2xl rounded-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between">
            <span>Select Task Type</span>
            <span className="font-mono text-[9px] text-primary">Monday.com</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
            {DEFAULT_TASK_TYPES.map((t) => {
              const isSelected =
                taskType.toLowerCase() === t.id.toLowerCase() ||
                taskType.toLowerCase() === t.name.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(t.name);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 font-bold text-foreground"
                      : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="truncate">{t.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}

            {customTypes.map((custom) => {
              const isSelected = taskType.toLowerCase() === custom.toLowerCase();
              return (
                <button
                  key={custom}
                  type="button"
                  onClick={() => {
                    onChange(custom);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 font-bold text-foreground"
                      : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400" />
                    <span className="truncate">{custom}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/50 mt-1 pt-1">
            {isAddingNew ? (
              <form onSubmit={handleAddNew} className="flex items-center space-x-1 p-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="New type name..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!newTypeName.trim()}
                  className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-md disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="w-full text-left px-2 py-1 text-primary hover:bg-primary/5 rounded-md flex items-center space-x-1 font-semibold text-[11px] cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Create New Type</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
