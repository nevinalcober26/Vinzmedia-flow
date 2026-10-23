"use client";

import React from "react";
import { useStore } from "@/context/StoreContext";
import {
  LayoutDashboard,
  Kanban,
  List as ListIcon,
  Calendar,
  Clock,
  Paperclip,
  StickyNote,
  Activity,
  Plus,
  Check,
  CheckCircle2,
  Flag,
  Users,
  Settings,
  ArrowLeft,
  CalendarDays,
  FileText,
  BarChart3,
  DollarSign,
  CreditCard,
  Receipt,
  Hourglass,
  Coins,
  Edit3,
  Printer,
  FileDown,
} from "lucide-react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ListView } from "@/components/tasks/ListView";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TimelineGanttView } from "@/components/timeline/TimelineGanttView";
import { ClientsFilesView } from "@/components/files/ClientsFilesView";
import { EditProjectBillingModal } from "@/components/modals/EditProjectBillingModal";
import { ProjectInvoiceModal } from "@/components/modals/ProjectInvoiceModal";
import { ProjectSubTab } from "@/types";
import { formatDate, getPriorityBadgeColor, getProjectStatusBadge } from "@/lib/utils";
import { UserAvatar } from "@/components/common/UserAvatar";

export function ProjectDetailView() {
  const {
    activeProject,
    projectSubTab,
    setProjectSubTab,
    setSelectedProjectId,
    setActiveView,
    tasks,
    files,
    users,
    notes,
    activityLogs,
    setIsCreateTaskModalOpen,
    togglePaymentPaid,
    toggleInstallmentPaid,
  } = useStore();

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-sm text-muted-foreground mb-4">No project selected</p>
        <button
          onClick={() => setActiveView("projects")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const projectTasks = tasks.filter((t) => t.project_id === activeProject.id);
  const doneTasks = projectTasks.filter((t) => t.status === "done").length;
  const projectNotes = notes.filter((n) => n.project_id === activeProject.id);
  const projectLogs = activityLogs.filter((l) => l.project_id === activeProject.id);
  const projectFiles = files.filter((f) => f.project_id === activeProject.id);

  const [isEditBillingOpen, setIsEditBillingOpen] = React.useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = React.useState(false);

  const totalTrackedSeconds = projectTasks.reduce((acc, t) => acc + (t.tracked_seconds || 0), 0);
  const totalTrackedHours = (totalTrackedSeconds / 3600).toFixed(1);
  const hourlyRate = activeProject.hourly_rate || 0;
  const accruedEarnings = ((totalTrackedSeconds / 3600) * hourlyRate).toFixed(2);
  const currencySymbol = activeProject.currency || "$";
  const hoursPerWeek = activeProject.estimated_hours_per_week || activeProject.estimated_hours || 40;
  const weeklyEstimatedAmount = (hourlyRate * hoursPerWeek).toFixed(2);

  let weeksToDeadline: number | null = null;
  let deadlineProjectedAmount: number | null = null;

  if (activeProject.target_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(activeProject.target_date);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    if (diffDays > 0) {
      weeksToDeadline = Math.max(1, Math.round((diffDays / 7) * 10) / 10);
      deadlineProjectedAmount = (hourlyRate * hoursPerWeek) * weeksToDeadline;
    }
  }

  const paidInstallments = (activeProject.installments || []).filter((i) => i.status === "paid");
  const paidInstallmentsCount = paidInstallments.length;
  const totalInstallmentsCount = activeProject.payment_installments_count || 1;
  const fixedPerInstallment = (activeProject.fixed_price_amount || 0) / totalInstallmentsCount;
  const fixedPaidAmount = paidInstallmentsCount * fixedPerInstallment;
  const isFixedFullyPaid = paidInstallmentsCount >= totalInstallmentsCount && totalInstallmentsCount > 0;
  const isHourlyPaid = activeProject.payment_status === "paid";

  const formatTrackedTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const tabs: { id: ProjectSubTab; label: string; icon: any; count?: number }[] = [
    { id: "list", label: "Main Table", icon: ListIcon, count: projectTasks.length },
    { id: "board", label: "Kanban", icon: Kanban },
    { id: "timeline", label: "Timeline", icon: BarChart3 },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "files", label: "Files", icon: Paperclip, count: projectFiles.length },
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "notes", label: "Notes", icon: StickyNote, count: projectNotes.length },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  const statusBadge = getProjectStatusBadge(activeProject.status);
  const priorityBadge = getPriorityBadgeColor(activeProject.priority);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Project Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSelectedProjectId(null);
              setActiveView("projects");
            }}
            title="Back to all projects"
            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <span
            className="w-4 h-4 rounded-md shadow-xs flex-shrink-0"
            style={{ backgroundColor: activeProject.color }}
          />

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-foreground">{activeProject.name}</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityBadge.bg} ${priorityBadge.text} ${priorityBadge.border} capitalize`}
              >
                {activeProject.priority}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {activeProject.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0073ea] hover:bg-[#0060c0] active:scale-98 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-1 border-b border-border/40 overflow-x-auto pb-1 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = projectSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setProjectSubTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-secondary text-foreground font-semibold shadow-2xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Rendering */}
      <div className="flex-1 overflow-hidden">
        {projectSubTab === "overview" && (
          <div className="h-full overflow-y-auto space-y-6 max-w-5xl">
            {/* Metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Completion</span>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {activeProject.progress}%
                </p>
                <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: activeProject.color,
                      width: `${activeProject.progress}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Total Tasks</span>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">
                  {doneTasks} / {projectTasks.length}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Done vs Pending</p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Target Date</span>
                <p className="text-sm font-bold text-foreground mt-1">
                  {formatDate(activeProject.target_date)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Started {formatDate(activeProject.start_date)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border shadow-2xs">
                <span className="text-xs text-muted-foreground font-medium">Project Visibility</span>
                <p className="text-sm font-bold text-foreground mt-1 flex items-center space-x-1.5">
                  {activeProject.all_members !== false ? (
                    <span className="text-emerald-500">🌐 All Team Members</span>
                  ) : (
                    <span className="text-amber-500">🔒 Restricted ({activeProject.member_ids?.length || 1} Assigned)</span>
                  )}
                </p>
                <div className="flex items-center -space-x-1.5 mt-2">
                  {(activeProject.all_members !== false ? users : users.filter((u) => (activeProject.member_ids || []).includes(u.id)))
                    .slice(0, 6)
                    .map((u) => (
                      <UserAvatar
                        key={u.id}
                        name={u.full_name}
                        avatarUrl={u.avatar_url}
                        size="xs"
                        className="ring-2 ring-card"
                      />
                    ))}
                  {(activeProject.all_members !== false ? users.length : (activeProject.member_ids?.length || 0)) > 6 && (
                    <div className="w-5 h-5 rounded-full bg-secondary text-[9px] font-bold text-muted-foreground flex items-center justify-center ring-2 ring-card">
                      +{(activeProject.all_members !== false ? users.length : (activeProject.member_ids?.length || 0)) - 6}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financials & Billing Model Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Project Billing & Time Tracking</h3>
                    <p className="text-[11px] text-muted-foreground">Contract model, financial metrics, and logged task hours</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeProject.billing_type === "hourly" ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Hourglass className="w-3 h-3" />
                      <span>Hourly Rate ({currencySymbol}{activeProject.hourly_rate || 0}/hr)</span>
                    </span>
                  ) : activeProject.billing_type === "fixed" ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Coins className="w-3 h-3" />
                      <span>Fixed Price ({currencySymbol}{(activeProject.fixed_price_amount || 0).toLocaleString()})</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-muted-foreground border border-border">
                      Standard
                    </span>
                  )}

                  {/* Edit Billing Button */}
                  <button
                    onClick={() => setIsEditBillingOpen(true)}
                    className="flex items-center space-x-1 px-3 py-1 rounded-lg border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer"
                    title="Edit project pricing and billing settings"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Edit Billing</span>
                  </button>

                  {/* Generate Invoice PDF Button */}
                  <button
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-[#0073ea] hover:bg-[#0060c0] text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    title="Generate and download billing invoice PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Invoice PDF</span>
                  </button>
                </div>
              </div>

              {activeProject.billing_type === "fixed" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                      <span className="text-[11px] text-muted-foreground font-medium">Contract Total</span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {currencySymbol}{(activeProject.fixed_price_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                      <span className="text-[11px] text-muted-foreground font-medium">Installments</span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {activeProject.payment_installments_count || 1} Payments
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                      <span className="text-[11px] text-muted-foreground font-medium">Per Payment</span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {currencySymbol}
                        {(
                          (activeProject.fixed_price_amount || 0) /
                          (activeProject.payment_installments_count || 1)
                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                      <span className="text-[11px] text-muted-foreground font-medium">Logged Labor Time</span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {formatTrackedTime(totalTrackedSeconds)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">across {projectTasks.length} tasks</p>
                    </div>
                  </div>

                  {/* Payment schedule breakdown with interactive Paid/Pending check toggle */}
                  <div className="p-3.5 rounded-xl bg-background border border-border/60 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-foreground">Payment Milestones Schedule</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">(Click any milestone to check if Paid)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {paidInstallmentsCount} of {totalInstallmentsCount} Paid ({currencySymbol}{fixedPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {currencySymbol}{(activeProject.fixed_price_amount || 0).toLocaleString()})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isFixedFullyPaid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : paidInstallmentsCount > 0
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-secondary text-muted-foreground border border-border"
                          }`}
                        >
                          {isFixedFullyPaid ? "✓ Paid in Full" : paidInstallmentsCount > 0 ? "Partially Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                      {Array.from({ length: totalInstallmentsCount }).map((_, idx) => {
                        const installmentNum = idx + 1;
                        const matchingInst = (activeProject.installments || []).find(
                          (i) => i.installment_number === installmentNum
                        );
                        const isPaid = matchingInst?.status === "paid";
                        const installmentAmount = (
                          (activeProject.fixed_price_amount || 0) / totalInstallmentsCount
                        ).toFixed(2);

                        return (
                          <div
                            key={idx}
                            onClick={() => toggleInstallmentPaid(activeProject.id, installmentNum)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                              isPaid
                                ? "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/15"
                                : "bg-secondary/20 border-border/80 hover:bg-secondary/40"
                            }`}
                            title="Click to toggle Paid / Pending"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-foreground">
                                Payment #{installmentNum}
                              </span>
                              <span
                                className={`inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded font-semibold transition-all ${
                                  isPaid
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "bg-secondary text-muted-foreground border border-border hover:border-foreground/30"
                                }`}
                              >
                                {isPaid ? <span>✓ Paid</span> : <span>Mark Paid</span>}
                              </span>
                            </div>
                            <p className="text-sm font-bold font-mono text-foreground mt-2">
                              {currencySymbol}{installmentAmount}
                            </p>
                            {isPaid && matchingInst?.paid_at ? (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                                Settled {formatDate(matchingInst.paid_at)}
                              </span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground mt-1">
                                Click to check as paid
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : activeProject.billing_type === "hourly" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                      <span className="text-[11px] text-muted-foreground font-medium">Hourly Billing Rate</span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {currencySymbol}{activeProject.hourly_rate || 0}<span className="text-xs text-muted-foreground font-normal">/hr</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                      <span className="text-[11px] text-muted-foreground font-medium">Estimated Hours / Week</span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {hoursPerWeek} <span className="text-xs text-muted-foreground font-normal">hrs/wk</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Total Amount / Week</span>
                      <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                        {currencySymbol}{weeklyEstimatedAmount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">based on {hoursPerWeek} hrs weekly commitment</p>
                    </div>

                    {/* Show Total Amount till Deadline ONLY if target_date exists */}
                    {activeProject.target_date && deadlineProjectedAmount !== null ? (
                      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Total till Target Deadline
                        </span>
                        <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {currencySymbol}
                          {deadlineProjectedAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {weeksToDeadline} weeks to {formatDate(activeProject.target_date)}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
                        <span className="text-[11px] text-muted-foreground font-medium">Logged Labor Value</span>
                        <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                          {currencySymbol}{accruedEarnings}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{totalTrackedHours} hrs tracked so far</p>
                      </div>
                    )}
                  </div>

                  {/* Task time logged status row & Hourly Paid Check */}
                  <div className="p-3.5 rounded-xl bg-background border border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <div>
                        <span className="font-semibold text-foreground">Accrued Billable Labor: </span>
                        <span className="font-mono font-bold text-foreground">
                          {formatTrackedTime(totalTrackedSeconds)} ({totalTrackedHours} hours)
                        </span>
                        <span className="text-muted-foreground ml-1.5">
                          accrued to {currencySymbol}{accruedEarnings}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                          isHourlyPaid
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <span>{isHourlyPaid ? "✓ Labor Settled & Paid" : "○ Unpaid / Pending Billing"}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => togglePaymentPaid(activeProject.id)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isHourlyPaid
                            ? "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                        }`}
                        title="Click to check or uncheck if billable hours are paid"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isHourlyPaid ? "Mark Unpaid" : "Check as Paid"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-secondary/20 border border-dashed border-border/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Total Logged Time</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatTrackedTime(totalTrackedSeconds)} recorded across {projectTasks.length} tasks
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-foreground">
                    {totalTrackedHours} Hours
                  </span>
                </div>
              )}
            </div>

            {/* Milestones Card */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flag className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-bold text-foreground">Project Milestones</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activeProject.milestones?.filter((m) => m.completed).length || 0} of{" "}
                  {activeProject.milestones?.length || 0} completed
                </span>
              </div>

              <div className="divide-y divide-border/40">
                {(activeProject.milestones || []).map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-2 h-2 rounded-full ${m.completed ? "bg-emerald-500" : "bg-purple-500"}`} />
                      <span className={`font-medium ${m.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {m.title}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono">
                      Target: {formatDate(m.target_date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description & Objective details */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <h3 className="text-sm font-bold text-foreground">Project Scope & Details</h3>
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {activeProject.description}
              </p>
            </div>
          </div>
        )}

        {projectSubTab === "board" && <KanbanBoard projectId={activeProject.id} />}
        {projectSubTab === "list" && <ListView projectId={activeProject.id} />}
        {projectSubTab === "calendar" && <CalendarView projectId={activeProject.id} />}
        {projectSubTab === "timeline" && <TimelineGanttView projectId={activeProject.id} />}
        {projectSubTab === "files" && (
          <div className="h-full overflow-hidden">
            <ClientsFilesView initialProjectId={activeProject.id} hideClientTab={true} />
          </div>
        )}

        {projectSubTab === "notes" && (
          <div className="h-full overflow-y-auto space-y-3 max-w-4xl">
            {projectNotes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-xs">
                <StickyNote className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p>No notes linked to this project yet.</p>
              </div>
            ) : (
              projectNotes.map((note) => (
                <div key={note.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <h4 className="text-sm font-bold text-foreground">{note.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap font-sans">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {projectSubTab === "activity" && (
          <div className="h-full overflow-y-auto space-y-2 max-w-3xl">
            {projectLogs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-xs">
                No recent activity for this project.
              </div>
            ) : (
              projectLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
                  <span className="text-foreground">{log.details}</span>
                  <span className="text-[10px] text-muted-foreground">{log.created_at.split("T")[0]}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Project Billing Modal */}
      <EditProjectBillingModal
        isOpen={isEditBillingOpen}
        onClose={() => setIsEditBillingOpen(false)}
        project={activeProject}
      />

      {/* Project Invoice PDF Generator Modal */}
      <ProjectInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        project={activeProject}
      />
    </div>
  );
}
