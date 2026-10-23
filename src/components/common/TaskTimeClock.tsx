"use client";

import React from "react";
import { useStore } from "@/context/StoreContext";
import { Play, Square, Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface TaskTimeClockProps {
  taskId: string;
  trackedSeconds: number;
  hourlyRate?: number;
  compact?: boolean;
  className?: string;
}

export function TaskTimeClock({
  taskId,
  trackedSeconds = 0,
  hourlyRate,
  compact = false,
  className = "",
}: TaskTimeClockProps) {
  const { activeTimer, startTimer, stopTimer } = useStore();

  const isCurrentTimerRunning = activeTimer?.taskId === taskId;
  const currentTotalSeconds = isCurrentTimerRunning
    ? trackedSeconds + activeTimer.seconds
    : trackedSeconds;

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentTimerRunning) {
      stopTimer();
    } else {
      startTimer(taskId);
    }
  };

  const formattedTime = formatDuration(currentTotalSeconds);
  const accruedEarnings = hourlyRate && currentTotalSeconds > 0
    ? ((currentTotalSeconds / 3600) * hourlyRate).toFixed(2)
    : null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggleTimer}
        title={
          isCurrentTimerRunning
            ? "Click to Stop Timer"
            : `Click to Start Timer (Tracked: ${formattedTime}${accruedEarnings ? ` • $${accruedEarnings}` : ""})`
        }
        className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
          isCurrentTimerRunning
            ? "bg-rose-500 text-white animate-pulse shadow-xs hover:bg-rose-600"
            : "bg-secondary/70 hover:bg-emerald-500/15 hover:text-emerald-500 text-muted-foreground border border-border/50"
        } ${className}`}
      >
        {isCurrentTimerRunning ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>{formattedTime}</span>
          </>
        ) : (
          <>
            <Play className="w-2.5 h-2.5 fill-current text-emerald-500" />
            <span>{currentTotalSeconds > 0 ? formattedTime : "0m"}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center space-x-2 ${className}`}
    >
      <button
        type="button"
        onClick={handleToggleTimer}
        title={isCurrentTimerRunning ? "Stop Active Clock" : "Start Time Clock"}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer ${
          isCurrentTimerRunning
            ? "bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-500/40 animate-pulse"
            : "bg-secondary/60 hover:bg-secondary text-foreground hover:border-emerald-500/50 border border-border/60"
        }`}
      >
        {isCurrentTimerRunning ? (
          <>
            <Square className="w-3 h-3 fill-white" />
            <span>{formattedTime}</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3 fill-emerald-500 text-emerald-500" />
            <span className={currentTotalSeconds > 0 ? "text-foreground" : "text-muted-foreground"}>
              {currentTotalSeconds > 0 ? formattedTime : "--"}
            </span>
          </>
        )}
      </button>

      {accruedEarnings && (
        <span
          title={`Accrued Billable Value @ $${hourlyRate}/hr`}
          className="text-[10px] font-mono text-emerald-500 font-semibold"
        >
          ${accruedEarnings}
        </span>
      )}
    </div>
  );
}
