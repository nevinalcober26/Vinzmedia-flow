"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  Calendar,
  FolderKanban,
  Clock,
  DollarSign,
  Sparkles,
  Building2,
  Eye,
  ShieldCheck,
  ArrowRight,
  Filter,
  Sun,
  Moon,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Project, Task, TimeEntry, User, Workspace } from "@/types";
import { formatDuration, formatDate } from "@/lib/utils";
import { exportTimeEntriesCsv } from "@/lib/exportTimeEntries";
import { useToast } from "@/context/ToastContext";
import { WorkspaceLogo } from "@/components/common/WorkspaceLogo";

interface TimeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TimeEntry[];
  projects: Project[];
  tasks: Task[];
  users: User[];
  workspace: Workspace;
  currentUser?: User;
  activeProjectFilter?: string;
  dateRangeLabel?: string;
  weekInterval?: { start: Date; end: Date };
}

export function TimeExportModal({
  isOpen,
  onClose,
  entries,
  projects,
  tasks,
  users,
  workspace,
  currentUser,
  activeProjectFilter = "all",
  dateRangeLabel,
  weekInterval,
}: TimeExportModalProps) {
  const toast = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Modal active tab: "select" (options cards) | "preview_pdf" (interactive printable preview)
  const [activeTab, setActiveTab] = useState<"select" | "preview_pdf">("select");

  // Filter scope state
  const [scope, setScope] = useState<"current_view" | "all_history" | "selected_project">("current_view");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjectFilter !== "all" ? activeProjectFilter : (projects[0]?.id || "all")
  );
  const [billableOnly, setBillableOnly] = useState(false);

  // PDF Preview theme (Executive Dark or Clean Light)
  const [pdfTheme, setPdfTheme] = useState<"dark" | "light">("dark");

  // Keep project filter in sync with caller
  useEffect(() => {
    if (activeProjectFilter !== "all") {
      setSelectedProjectId(activeProjectFilter);
    }
  }, [activeProjectFilter]);

  // Reset to select screen when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab("select");
    }
  }, [isOpen]);

  // Escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Compute filtered dataset according to chosen scope
  const exportDataset = useMemo(() => {
    return entries.filter((entry) => {
      if (billableOnly && !entry.is_billable) return false;

      if (scope === "selected_project") {
        if (selectedProjectId !== "all" && entry.project_id !== selectedProjectId) return false;
      } else if (scope === "current_view" && weekInterval) {
        const started = parseISO(entry.started_at);
        if (!isValid(started)) return false;
        if (started < weekInterval.start || started > weekInterval.end) return false;
        if (activeProjectFilter !== "all" && entry.project_id !== activeProjectFilter) return false;
      }

      return true;
    }).sort((a, b) => b.started_at.localeCompare(a.started_at));
  }, [entries, scope, weekInterval, selectedProjectId, activeProjectFilter, billableOnly]);

  // KPI Calculations for the exported data
  const summary = useMemo(() => {
    let totalSeconds = 0;
    let billableSeconds = 0;
    let billableAmount = 0;
    const projectBreakdown = new Map<string, { seconds: number; count: number; name: string }>();

    exportDataset.forEach((entry) => {
      const sec = entry.duration_seconds || 0;
      totalSeconds += sec;
      const proj = projects.find((p) => p.id === entry.project_id);
      const projName = proj?.name || entry.project_name || "Unassigned";

      if (entry.is_billable) {
        billableSeconds += sec;
        const rate = proj?.hourly_rate || 0;
        billableAmount += (sec / 3600) * rate;
      }

      const existing = projectBreakdown.get(entry.project_id || "unassigned") || {
        seconds: 0,
        count: 0,
        name: projName,
      };
      existing.seconds += sec;
      existing.count += 1;
      projectBreakdown.set(entry.project_id || "unassigned", existing);
    });

    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const billableHours = Math.round((billableSeconds / 3600) * 10) / 10;
    const billableRatio = totalSeconds > 0 ? Math.round((billableSeconds / totalSeconds) * 100) : 0;

    return {
      totalEntries: exportDataset.length,
      totalSeconds,
      totalHours,
      billableSeconds,
      billableHours,
      billableAmount,
      billableRatio,
      projects: Array.from(projectBreakdown.values()).sort((a, b) => b.seconds - a.seconds),
    };
  }, [exportDataset, projects]);

  // Execution: Export CSV
  const handleExportCsv = () => {
    if (exportDataset.length === 0) {
      toast.warning("No entries to export", "Try selecting 'All Recorded Time Logs' to export your entire history.");
      return;
    }
    const count = exportTimeEntriesCsv(
      exportDataset,
      projects,
      tasks,
      `vinzmedia-time-report-${scope}`
    );
    toast.success("CSV Downloaded", `Exported ${count} time log ${count === 1 ? "entry" : "entries"}.`);
    onClose();
  };

  // Execution: Trigger PDF Print dialog via isolated iframe
  const handlePrintPdf = async () => {
    if (exportDataset.length === 0) {
      toast.warning("No entries to export", "Try selecting 'All Recorded Time Logs' to export your entire history.");
      return;
    }

    if (activeTab !== "preview_pdf") {
      setActiveTab("preview_pdf");
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }

    const printableElement = document.getElementById("timelog-printable-area");
    if (!printableElement) {
      window.print();
      return;
    }

    try {
      await document.fonts.ready;
      const images = Array.from(printableElement.querySelectorAll<HTMLImageElement>("img"));
      await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
    } catch {}

    // Clean up any old print iframe
    const oldIframe = document.getElementById("timelog-print-frame");
    if (oldIframe) oldIframe.remove();

    // Create an isolated printing iframe attached to body
    const iframe = document.createElement("iframe");
    iframe.id = "timelog-print-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    // Collect all stylesheets from host document
    const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    const isDark = pdfTheme === "dark";

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>VinzMedia Timesheet Report - ${reportId}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: ${isDark ? "#0a1018" : "#ffffff"} !important;
              color: ${isDark ? "#f6f9fc" : "#0f172a"} !important;
              font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            #timelog-printable-area {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              background-color: ${isDark ? "#0a1018" : "#ffffff"} !important;
              color: ${isDark ? "#f6f9fc" : "#0f172a"} !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            tr {
              page-break-inside: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body class="${isDark ? "dark" : ""}">
          <div style="width: 100%; max-width: 850px; margin: 0 auto; padding: 4px;">
            ${printableElement.outerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Ensure images and fonts inside the iframe are fully decoded before opening print dialog
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      if (iframe.contentWindow?.document?.fonts) {
        await iframe.contentWindow.document.fonts.ready;
      }
      const frameImages = Array.from(iframe.contentDocument?.querySelectorAll<HTMLImageElement>("img") || []);
      await Promise.all(frameImages.map((img) => img.decode().catch(() => undefined)));
    } catch {}

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 3000);
    }
  };

  const reportId = useMemo(() => {
    return `VM-TR-${format(new Date(), "yyyyMMdd-HHmm")}`;
  }, []);

  const generatedDateDisplay = useMemo(() => {
    return format(new Date(), "MMMM d, yyyy · h:mm a");
  }, []);

  const scopeLabel = useMemo(() => {
    if (scope === "current_view") {
      return dateRangeLabel ? `Current Week (${dateRangeLabel})` : "Current Week View";
    }
    if (scope === "selected_project") {
      const proj = projects.find((p) => p.id === selectedProjectId);
      return proj ? `Project: ${proj.name}` : "Selected Project";
    }
    return "All Recorded Workspace History";
  }, [scope, dateRangeLabel, projects, selectedProjectId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Scoped Print Stylesheet for direct Cmd+P support */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                html, body {
                  overflow: visible !important;
                  height: auto !important;
                  background-color: ${pdfTheme === "dark" ? "#0a1018" : "#ffffff"} !important;
                }
                body * {
                  visibility: hidden !important;
                }
                /* Reset modal wrapper clipping and centering so content expands naturally */
                .fixed, [role="dialog"], .overflow-y-auto, .overflow-hidden, .overflow-x-auto {
                  position: static !important;
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                  transform: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                  background: transparent !important;
                }
                #timelog-printable-area, #timelog-printable-area * {
                  visibility: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                #timelog-printable-area {
                  position: static !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: 8px !important;
                  box-shadow: none !important;
                  border: none !important;
                  background-color: ${pdfTheme === "dark" ? "#0a1018" : "#ffffff"} !important;
                  color: ${pdfTheme === "dark" ? "#f6f9fc" : "#0f172a"} !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `,
          }}
        />

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md no-print"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          className="relative z-10 flex w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="no-print flex items-center justify-between border-b border-border/80 px-6 py-4 bg-secondary/30 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-xs">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  Export Time & Labor Reports
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    {summary.totalEntries} {summary.totalEntries === 1 ? "entry" : "entries"}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Download raw CSV data or generate a branded Vinzmedia PDF timesheet report
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {activeTab === "preview_pdf" && (
                <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border text-xs mr-2">
                  <button
                    type="button"
                    onClick={() => setPdfTheme("dark")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pdfTheme === "dark"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Executive Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfTheme("light")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pdfTheme === "light"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light Paper
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="no-print flex items-center justify-between px-6 py-2.5 border-b border-border/60 bg-secondary/10 shrink-0 text-xs">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab("select")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "select"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                1. Export Formats
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview_pdf")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "preview_pdf"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> 2. PDF Preview & Print
              </button>
            </div>

            {/* Quick scope badge */}
            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <span className="font-medium">Scope:</span>
              <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-semibold">
                {scopeLabel}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Scope & Filtering Bar (always accessible) */}
            <div className="no-print rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-primary" /> Filter Entries to Export:
                </span>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={billableOnly}
                    onChange={(e) => setBillableOnly(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Billable sessions only</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setScope("current_view")}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    scope === "current_view"
                      ? "border-primary bg-primary/10 text-foreground font-semibold shadow-xs"
                      : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <div>
                    <p className="font-bold">Current Week</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {dateRangeLabel || "Filtered view"}
                    </p>
                  </div>
                  {scope === "current_view" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setScope("all_history")}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    scope === "all_history"
                      ? "border-primary bg-primary/10 text-foreground font-semibold shadow-xs"
                      : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <div>
                    <p className="font-bold">All Time Entries</p>
                    <p className="text-[11px] text-muted-foreground">Entire recorded workspace history</p>
                  </div>
                  {scope === "all_history" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </button>

                <div
                  className={`p-3 rounded-xl border transition-all ${
                    scope === "selected_project"
                      ? "border-primary bg-primary/10 text-foreground shadow-xs"
                      : "border-border bg-card/60 text-muted-foreground"
                  }`}
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setScope("selected_project")}
                  >
                    <p className="font-bold text-xs">By Project</p>
                    {scope === "selected_project" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setScope("selected_project");
                    }}
                    className="mt-1.5 w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Realtime KPI Pill Summary */}
              <div className="flex items-center gap-4 text-xs pt-1 flex-wrap text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Total Time: <strong className="text-foreground">{formatDuration(summary.totalSeconds)}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  Billable Value:{" "}
                  <strong className="text-foreground">
                    ${summary.billableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-amber-500" />
                  Projects: <strong className="text-foreground">{summary.projects.length}</strong>
                </span>
              </div>
            </div>

            {/* TAB 1: Format Selection Cards */}
            {activeTab === "select" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Select Export Format</h3>
                  <p className="text-xs text-muted-foreground">
                    Choose how you want to download or present your time tracking logs
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* CSV Export Card */}
                  <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-emerald-500/60 transition-all hover:shadow-md">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          .CSV Spreadsheet
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-foreground">CSV Spreadsheet</h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Clean comma-separated values file compatible with Microsoft Excel, Google Sheets, Apple Numbers, and payroll accounting tools.
                        </p>
                      </div>

                      <div className="rounded-xl bg-secondary/30 p-3 text-[11px] space-y-1.5 text-muted-foreground">
                        <p className="font-semibold text-foreground">Included data columns:</p>
                        <p>Date · Project · Task · Work Summary · Duration · Billable Status · Timestamps</p>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download CSV Spreadsheet</span>
                      </button>
                    </div>
                  </div>

                  {/* PDF Export Card */}
                  <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-indigo-500/60 transition-all hover:shadow-md">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                          <FileText className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Premium PDF Template
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-foreground flex items-center gap-1.5">
                          Executive PDF Timesheet
                          <Sparkles className="w-4 h-4 text-amber-500" />
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Formal presentation-ready document styled with the Vinzmedia company branding, executive KPI cards, itemized sessions, and verification signatures.
                        </p>
                      </div>

                      <div className="rounded-xl bg-secondary/30 p-3 text-[11px] space-y-1.5 text-muted-foreground">
                        <p className="font-semibold text-foreground">Branded features:</p>
                        <p>Vinzmedia Brand Mark · Timesheet Totals · Work Descriptions · Manager Sign-off</p>
                      </div>
                    </div>

                    <div className="pt-6 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("preview_pdf")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary px-3 py-2.5 text-xs font-bold text-foreground transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span>Preview Document</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintPdf}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print / Save PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Live PDF Preview & Printable Sheet */}
            {(activeTab === "preview_pdf" || true) && (
              <div className={activeTab !== "preview_pdf" ? "hidden" : "space-y-4"}>
                {/* Preview Action Bar */}
                <div className="no-print flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">PDF Document Ready:</span>
                    <span className="text-muted-foreground">
                      {summary.totalEntries} sessions · {formatDuration(summary.totalSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-emerald-500/50 hover:text-emerald-500 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> CSV Also
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintPdf}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                    </button>
                  </div>
                </div>

                {/* The Formal Printable Document Container */}
                <div className="rounded-2xl border border-border/80 p-2 sm:p-6 bg-slate-900/40 overflow-x-auto">
                  <article
                    id="timelog-printable-area"
                    className={`mx-auto max-w-[850px] rounded-xl border p-6 sm:p-10 shadow-xl transition-colors ${
                      pdfTheme === "dark"
                        ? "bg-[#0a1018] text-[#f6f9fc] border-[#213545]"
                        : "bg-white text-slate-900 border-slate-200"
                    }`}
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                  >
                    {/* Header: Company Logo & Details */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b pb-8 border-current/15">
                      <div className="flex items-center gap-4">
                        {workspace.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={workspace.logo_url}
                            alt={`${workspace.name} Logo`}
                            onError={(e) => {
                              e.currentTarget.src = "/vinzmedia-brand.png";
                            }}
                            className="h-12 w-auto max-w-[180px] object-contain rounded-lg"
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md">
                              VF
                            </div>
                            <div>
                              <p className="text-xl font-black tracking-tight leading-none">VINZMEDIA</p>
                              <p className="text-xs opacity-75 font-medium mt-1">Design & Development</p>
                            </div>
                          </div>
                        )}
                        {workspace.logo_url && (
                          <div className="border-l pl-4 border-current/15">
                            <p className="text-base font-black tracking-tight uppercase leading-none">
                              {workspace.name}
                            </p>
                            <p className="text-xs opacity-70 font-medium mt-1">
                              {workspace.tagline || "Design & Development"}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right space-y-1">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                          Confidential Timesheet Report
                        </span>
                        <h1 className="text-lg font-bold tracking-tight">Time & Labor Summary</h1>
                        <p className="text-xs opacity-70 font-mono">Ref: {reportId}</p>
                      </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-b border-current/15 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Organization</span>
                        <strong className="text-sm font-semibold mt-0.5 block">{workspace.name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Generated By</span>
                        <span className="font-medium mt-0.5 block">{currentUser?.full_name || "Vinz Media (Owner)"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Reporting Scope</span>
                        <span className="font-medium mt-0.5 block truncate" title={scopeLabel}>
                          {scopeLabel}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Date Generated</span>
                        <span className="font-medium mt-0.5 block">{generatedDateDisplay}</span>
                      </div>
                    </div>

                    {/* Executive Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-6">
                      <div
                        className={`p-4 rounded-xl border ${
                          pdfTheme === "dark"
                            ? "bg-[#101b26] border-[#294051]"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                          Total Time Logged
                        </span>
                        <p className="text-2xl font-black tracking-tight font-mono mt-1 text-indigo-400">
                          {formatDuration(summary.totalSeconds)}
                        </p>
                        <span className="text-[10px] opacity-60 mt-1 block">
                          {summary.totalHours} billable/non-billable hours
                        </span>
                      </div>

                      <div
                        className={`p-4 rounded-xl border ${
                          pdfTheme === "dark"
                            ? "bg-[#101b26] border-[#294051]"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                          Billable Labor
                        </span>
                        <p className="text-2xl font-black tracking-tight font-mono mt-1 text-emerald-400">
                          {formatDuration(summary.billableSeconds)}
                        </p>
                        <span className="text-[10px] opacity-60 mt-1 block">
                          {summary.billableRatio}% of total recorded time
                        </span>
                      </div>

                      <div
                        className={`p-4 rounded-xl border ${
                          pdfTheme === "dark"
                            ? "bg-[#101b26] border-[#294051]"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                          Billable Value
                        </span>
                        <p className="text-2xl font-black tracking-tight font-mono mt-1 text-emerald-400">
                          ${summary.billableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className="text-[10px] opacity-60 mt-1 block">Based on project hourly rates</span>
                      </div>

                      <div
                        className={`p-4 rounded-xl border ${
                          pdfTheme === "dark"
                            ? "bg-[#101b26] border-[#294051]"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                          Logged Sessions
                        </span>
                        <p className="text-2xl font-black tracking-tight font-mono mt-1 text-amber-400">
                          {summary.totalEntries}
                        </p>
                        <span className="text-[10px] opacity-60 mt-1 block">Individual timer sessions</span>
                      </div>
                    </div>

                    {/* Project Distribution Section */}
                    {summary.projects.length > 0 && (
                      <div className="mb-6 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">
                          Project Allocation Breakdown
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {summary.projects.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                pdfTheme === "dark"
                                  ? "bg-[#101b26]/70 border-[#294051]"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <span className="font-semibold truncate max-w-[140px]">{item.name}</span>
                              <div className="text-right font-mono text-[11px]">
                                <span className="font-bold">{formatDuration(item.seconds)}</span>
                                <span className="opacity-60 ml-1">({item.count})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Itemized Table: Details of Time spent and all */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          Itemized Time Sessions & Work Details
                        </span>
                        <span className="text-[10px] opacity-60 font-mono">
                          Showing {exportDataset.length} of {exportDataset.length} records
                        </span>
                      </div>

                      <div className="rounded-xl border overflow-hidden border-current/15">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr
                              className={`border-b border-current/15 text-[10px] font-bold uppercase tracking-wider ${
                                pdfTheme === "dark" ? "bg-[#13202e]" : "bg-slate-100"
                              }`}
                            >
                              <th className="py-2.5 px-3 w-24">Date</th>
                              <th className="py-2.5 px-3 w-36">Project</th>
                              <th className="py-2.5 px-3 w-40">Task</th>
                              <th className="py-2.5 px-3">Work Summary & Notes</th>
                              <th className="py-2.5 px-3 w-24 text-right">Duration</th>
                              <th className="py-2.5 px-3 w-20 text-center">Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-current/10">
                            {exportDataset.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center opacity-60">
                                  No time logs found matching the selected scope.
                                </td>
                              </tr>
                            ) : (
                              exportDataset.map((entry, i) => {
                                const project = projects.find((p) => p.id === entry.project_id);
                                const task = tasks.find((t) => t.id === entry.task_id);
                                const dateFormatted = isValid(parseISO(entry.started_at))
                                  ? format(parseISO(entry.started_at), "MMM d, yyyy")
                                  : entry.started_at;

                                return (
                                  <tr
                                    key={entry.id || i}
                                    className={`${
                                      i % 2 === 1
                                        ? pdfTheme === "dark"
                                          ? "bg-[#0d1620]/60"
                                          : "bg-slate-50/70"
                                        : ""
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 font-mono text-[11px] align-top whitespace-nowrap">
                                      {dateFormatted}
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold align-top truncate max-w-[140px]">
                                      {project?.name || entry.project_name || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 align-top font-medium truncate max-w-[160px]">
                                      {task?.title || entry.task_title || "General Initiative"}
                                    </td>
                                    <td className="py-2.5 px-3 align-top leading-relaxed text-[11px] opacity-90">
                                      {entry.work_summary || entry.description || (
                                        <span className="opacity-40 italic">No notes recorded</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold align-top whitespace-nowrap">
                                      {formatDuration(entry.duration_seconds)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center align-top">
                                      <span
                                        className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                          entry.is_billable
                                            ? "bg-emerald-500/15 text-emerald-400"
                                            : "opacity-60 bg-current/10"
                                        }`}
                                      >
                                        {entry.is_billable ? "Billable" : "Standard"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          <tfoot>
                            <tr
                              className={`border-t-2 border-current/25 font-bold ${
                                pdfTheme === "dark" ? "bg-[#13202e]" : "bg-slate-100"
                              }`}
                            >
                              <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-[11px]">
                                Total Accumulated Time:
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-sm text-indigo-400 font-extrabold whitespace-nowrap">
                                {formatDuration(summary.totalSeconds)}
                              </td>
                              <td className="py-3 px-3 text-center text-[10px] opacity-75 font-mono">
                                ({summary.totalHours}h)
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Verification and Signatures */}
                    <div className="mt-10 pt-8 border-t border-current/15 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-6">
                          Timesheet Certification
                        </p>
                        <div className="border-b border-current/30 pb-1 mb-2 w-48" />
                        <p className="font-semibold">{currentUser?.full_name || "Vinz Media"}</p>
                        <p className="text-[11px] opacity-60">Operations & Workspace Lead</p>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
                          <ShieldCheck className="w-4 h-4" /> Vinzmedia Verified Timesheet
                        </div>
                        <p className="text-[10px] opacity-60 leading-relaxed max-w-xs sm:ml-auto">
                          Generated directly from authenticated work session timers in the Vinzmedia platform.
                        </p>
                        <p className="text-[9px] font-mono opacity-40 mt-1">
                          Document ID: {reportId} · Confidential
                        </p>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="no-print flex items-center justify-between border-t border-border/80 px-6 py-4 bg-secondary/30 shrink-0">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {summary.totalEntries} entries selected ({formatDuration(summary.totalSeconds)})
            </p>

            <div className="flex items-center space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
