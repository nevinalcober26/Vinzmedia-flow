"use client";

import React, { useState, useRef, useEffect } from "react";
import { MONDAY_PRIORITIES, MondayPriorityOption } from "@/lib/mondayTheme";
import { PriorityLevel } from "@/types";

interface MondayPriorityCellProps {
  priority: PriorityLevel;
  onChange: (newPriority: PriorityLevel) => void;
  className?: string;
}

export function MondayPriorityCell({
  priority,
  onChange,
  className = "",
}: MondayPriorityCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConfig = MONDAY_PRIORITIES[priority] || {
    key: priority,
    label: priority,
    bg: "#797e93",
    textColor: "#ffffff",
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: MondayPriorityOption) => {
    setIsOpen(false);
    if (option.key !== priority) {
      onChange(option.key as PriorityLevel);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* Monday Solid Color Priority Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: currentConfig.bg,
          color: currentConfig.textColor,
        }}
        className={`w-full py-2 px-2 text-center text-xs font-bold tracking-tight rounded-sm transition-all shadow-2xs hover:brightness-105 active:scale-98 select-none truncate ${className}`}
      >
        {currentConfig.label}
      </button>

      {/* Monday Popover Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div className="absolute top-full mt-1.5 z-50 w-44 p-2 rounded-2xl bg-card border border-border/80 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider border-b border-border/50 mb-1.5">
              Select Priority
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.values(MONDAY_PRIORITIES).map((opt) => {
                const isSelected = opt.key === priority;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    style={{
                      backgroundColor: opt.bg,
                      color: opt.textColor,
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-center transition-all hover:scale-[1.02] active:scale-98 shadow-xs flex items-center justify-center relative cursor-pointer ${
                      isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="absolute right-2.5 text-[11px]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
