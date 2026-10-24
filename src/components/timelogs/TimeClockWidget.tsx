"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock3, FileSpreadsheet, Play, Square, X } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { formatTimerDisplay } from "@/lib/utils";
import { exportTimeEntriesCsv } from "@/lib/exportTimeEntries";

export function TimeClockWidget({ onOpen }: { onOpen?: () => void }) {
  const { projects, tasks, timeEntries, activeTimer, startProjectTimer, updateTimerSummary, stopTimer, setActiveView } = useStore();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [summary, setSummary] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!isOpen) return;
    setSummary(activeTimer?.summary || "");
    setProjectId(activeTimer?.projectId || projects[0]?.id || "");
    setTaskId(activeTimer?.taskId || "");
  }, [isOpen, activeTimer?.projectId]);
  useEffect(() => {
    if (!isOpen) return;
    const focusFrame = requestAnimationFrame(() => {
      (dialogRef.current?.querySelector<HTMLElement>("select") || dialogRef.current?.querySelector<HTMLElement>("textarea"))?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "Tab" && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), textarea:not(:disabled)"));
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { cancelAnimationFrame(focusFrame); window.removeEventListener("keydown", onKeyDown); triggerRef.current?.focus(); };
  }, [isOpen]);

  const start = () => {
    if (!projectId || !taskId || !summary.trim()) return;
    if (startProjectTimer(projectId, taskId, summary)) toast.success("Timeclock started", "Your task and work summary will be saved with the session.");
  };

  const stop = () => {
    stopTimer(summary);
    setIsOpen(false);
    toast.success("Time session recorded", "The work summary and time spent are in Time Tracking.");
  };

  return (
    <>
      <motion.button
        ref={triggerRef}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => { onOpen?.(); setIsOpen(true); }}
        className={`relative z-50 mb-3 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-soft ${activeTimer ? "border-emerald-500/30 bg-emerald-500 text-white" : "border-border bg-card text-foreground hover:border-primary/50 hover:text-primary"}`}
        aria-label={activeTimer ? "Open running timeclock" : "Open timeclock"}
        title={activeTimer ? "Timeclock running" : "Timeclock"}
      >
        <Clock3 className="h-4 w-4" />
        <span>{activeTimer ? formatTimerDisplay(activeTimer.seconds) : "Timeclock"}</span>
        {activeTimer && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
      </motion.button>

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="timeclock-overlay fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-3 backdrop-blur-xs sm:items-center sm:p-6" onClick={() => setIsOpen(false)}>
              <motion.section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="timeclock-title"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl"
              >
                <header className="flex items-start justify-between border-b border-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Clock3 className="h-5 w-5" /></span>
                    <div><h2 id="timeclock-title" className="text-sm font-bold">Project timeclock</h2><p className="mt-0.5 text-xs text-muted-foreground">Track focused work and keep a clear log.</p></div>
                  </div>
                  <button type="button" onClick={() => setIsOpen(false)} aria-label="Close timeclock" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
                </header>

                <div className="space-y-5 p-5">
                  {activeTimer && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Recording · {activeTimer.projectName}</p><p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground">{formatTimerDisplay(activeTimer.seconds)}</p>{activeTimer.taskId && <p className="mt-1 text-xs text-muted-foreground">Task: {activeTimer.taskTitle}</p>}</div>}
                  <label className="block space-y-1.5 text-xs font-semibold">
                    <span>Project</span>
                    {activeTimer ? <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 font-medium">{activeTimer.projectName}</div> : <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setTaskId(""); }} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground outline-hidden focus:ring-2 focus:ring-primary/30"><option value="">Choose a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>}
                  </label>
                  <label className="block space-y-1.5 text-xs font-semibold"><span>Task</span>{activeTimer ? <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 font-medium">{activeTimer.taskTitle}</div> : <select value={taskId} onChange={(event) => setTaskId(event.target.value)} disabled={!projectId} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground outline-hidden focus:ring-2 focus:ring-primary/30 disabled:opacity-50"><option value="">{tasks.some((task) => task.project_id === projectId) ? "Choose a task" : "No tasks in this project"}</option>{tasks.filter((task) => task.project_id === projectId).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select>}</label>
                  <label className="block space-y-1.5 text-xs font-semibold"><span>Work summary</span><textarea rows={3} value={summary} onChange={(event) => { setSummary(event.target.value); if (activeTimer) updateTimerSummary(event.target.value); }} placeholder="What are you working on?" className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 font-normal leading-relaxed text-foreground outline-hidden focus:ring-2 focus:ring-primary/30" /><span className="block font-normal text-muted-foreground">Saved with this session in Time Tracking.</span></label>
                  {activeTimer ? <button type="button" onClick={stop} disabled={!summary.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-50"><Square className="h-4 w-4 fill-current" /> Stop &amp; save session</button> : <button type="button" onClick={start} disabled={!projectId || !taskId || !summary.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Play className="h-4 w-4 fill-current" /> Start timeclock</button>}
                  <button type="button" onClick={() => { const count = exportTimeEntriesCsv(timeEntries, projects, tasks); toast.success("CSV exported", `${count} time ${count === 1 ? "entry" : "entries"} downloaded.`); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"><FileSpreadsheet className="h-4 w-4" /> Export time logs as CSV</button>
                  <button type="button" onClick={() => { setIsOpen(false); setActiveView("timelogs"); }} className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary">View time tracking logs <ArrowRight className="h-3.5 w-3.5" /></button>
                </div>
              </motion.section>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
