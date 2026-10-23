"use client";

import React from "react";

interface BatterySegment {
  key?: string;
  label: string;
  bg: string;
  count: number;
  percentage: number;
}

interface MondayBatteryBarProps {
  segments: BatterySegment[];
  height?: string;
  className?: string;
}

export function MondayBatteryBar({
  segments,
  height = "h-4",
  className = "",
}: MondayBatteryBarProps) {
  if (!segments.length) {
    return (
      <div
        className={`w-full ${height} rounded-md bg-secondary/40 border border-border/40 ${className}`}
      />
    );
  }

  return (
    <div
      className={`w-full ${height} rounded-sm overflow-hidden flex bg-secondary/50 border border-border/40 shadow-2xs relative group ${className}`}
    >
      {segments.map((seg, idx) => {
        if (seg.percentage <= 0) return null;
        return (
          <div
            key={idx}
            style={{
              width: `${seg.percentage}%`,
              backgroundColor: seg.bg,
            }}
            title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
            className="h-full transition-all duration-300 hover:brightness-110 relative flex items-center justify-center cursor-help"
          >
            {seg.percentage >= 18 && (
              <span className="text-[9px] font-bold text-white tracking-tighter truncate px-1 drop-shadow-xs">
                {seg.percentage}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
