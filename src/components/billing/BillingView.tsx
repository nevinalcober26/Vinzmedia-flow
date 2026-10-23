"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Receipt,
  DollarSign,
  Clock,
  Coins,
  CheckCircle2,
  ArrowRightLeft,
  Globe,
  RefreshCw,
  FileText,
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  Calendar,
  Building2,
  ChevronRight,
  ChevronDown,
  Download,
  Printer,
  ExternalLink,
  AlertCircle,
  Check,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Briefcase,
  Users,
} from "lucide-react";
import { Project, Task, Client, ProjectPaymentInstallment } from "@/types";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import {
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
  getDefaultExchangeRate,
  fetchRealtimeExchangeRate,
  formatCurrencyAmount,
} from "@/lib/currencyRates";
import { ClientAvatar } from "@/components/common/ClientAvatar";
import { EditProjectBillingModal } from "@/components/modals/EditProjectBillingModal";
import { ProjectInvoiceModal } from "@/components/modals/ProjectInvoiceModal";
import { formatDate } from "@/lib/utils";

export function BillingView() {
  const {
    projects,
    tasks,
    clients,
    activeWorkspace,
    togglePaymentPaid,
    toggleInstallmentPaid,
    setSelectedProjectId,
    setActiveView,
  } = useStore();
  const toast = useToast();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"projects" | "invoices" | "hourly">("projects");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Currency Converter Preview State
  const [enableConversionPreview, setEnableConversionPreview] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState("AUD");
  const [ratesMap, setRatesMap] = useState<Record<string, number>>({});
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [lastRatesUpdated, setLastRatesUpdated] = useState<string>("");

  // Modals state
  const [editingBillingProject, setEditingBillingProject] = useState<Project | null>(null);
  const [invoicingProject, setInvoicingProject] = useState<Project | null>(null);

  // Fetch exchange rates when targetCurrency changes or conversion is toggled
  const refreshExchangeRates = async () => {
    setIsFetchingRates(true);
    try {
      const distinctCurrencies = Array.from(
        new Set([
          "USD",
          "AUD",
          "PHP",
          "EUR",
          ...projects.map((p) => p.currency || "USD"),
        ])
      );

      const newRates: Record<string, number> = {};
      for (const cur of distinctCurrencies) {
        const { rate, lastUpdated } = await fetchRealtimeExchangeRate(cur, targetCurrency);
        newRates[cur] = rate;
        if (lastUpdated) setLastRatesUpdated(lastUpdated);
      }
      setRatesMap(newRates);
    } catch (e) {
      console.error("Error refreshing exchange rates:", e);
    } finally {
      setIsFetchingRates(false);
    }
  };

  useEffect(() => {
    if (enableConversionPreview) {
      refreshExchangeRates();
    }
  }, [enableConversionPreview, targetCurrency, projects]);

  // Project Client map helper
  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach((c) => map.set(c.id, c));
    return map;
  }, [clients]);

  // Tasks by project map helper
  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const list = map.get(t.project_id) || [];
      list.push(t);
      map.set(t.project_id, list);
    });
    return map;
  }, [tasks]);

  // Calculate project financial figures
  const projectFinancials = useMemo(() => {
    return projects.map((proj) => {
      const isHourly = proj.billing_type === "hourly";
      const projTasks = tasksByProject.get(proj.id) || [];
      const totalTrackedSeconds = projTasks.reduce(
        (sum, t) => sum + (t.tracked_seconds || 0),
        0
      );
      const trackedHours = Math.round((totalTrackedSeconds / 3600) * 10) / 10;
      const hourlyRate = proj.hourly_rate || 0;
      const hourlyTotal = trackedHours * hourlyRate;

      // Fixed price calculations
      const fixedTotal = proj.fixed_price_amount || 0;
      const installments = proj.installments || [];
      const paidInstallments = installments.filter((i) => i.status === "paid");
      const paidMilestonesAmount = paidInstallments.reduce(
        (sum, i) => sum + (Number(i.amount) || 0),
        0
      );

      // Hourly paid calculations
      const paidTasksTrackedSeconds = projTasks
        .filter((t) => t.is_paid)
        .reduce((sum, t) => sum + (t.tracked_seconds || 0), 0);
      const paidHourlyAmount =
        (paidTasksTrackedSeconds / 3600) * hourlyRate;

      // Effective amounts
      const totalAmount = isHourly ? hourlyTotal : fixedTotal;
      const paidAmount = isHourly
        ? paidHourlyAmount
        : installments.length > 0
        ? paidMilestonesAmount
        : proj.payment_status === "paid"
        ? fixedTotal
        : proj.paid_amount || 0;
      const pendingAmount = Math.max(0, totalAmount - paidAmount);

      // Status
      let effectiveStatus: "paid" | "partially_paid" | "unpaid" = "unpaid";
      if (totalAmount > 0 && paidAmount >= totalAmount - 0.01) {
        effectiveStatus = "paid";
      } else if (paidAmount > 0) {
        effectiveStatus = "partially_paid";
      } else {
        effectiveStatus = proj.payment_status || "unpaid";
      }

      // Currency conversion
      const baseCur = proj.currency || "$";
      const fxRate =
        ratesMap[baseCur] ||
        getDefaultExchangeRate(baseCur, targetCurrency);
      const convertedTotal = totalAmount * fxRate;
      const convertedPaid = paidAmount * fxRate;
      const convertedPending = pendingAmount * fxRate;

      const client = proj.client_id ? clientMap.get(proj.client_id) : undefined;

      return {
        project: proj,
        client,
        isHourly,
        totalAmount,
        paidAmount,
        pendingAmount,
        effectiveStatus,
        trackedHours,
        hourlyRate,
        installments,
        paidInstallmentsCount: paidInstallments.length,
        totalInstallmentsCount: installments.length || proj.payment_installments_count || 1,
        // Conversion values
        fxRate,
        convertedTotal,
        convertedPaid,
        convertedPending,
      };
    });
  }, [projects, tasksByProject, clientMap, ratesMap, targetCurrency]);

  // Filtered projects
  const filteredProjectFinancials = useMemo(() => {
    return projectFinancials.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const pMatch = item.project.name.toLowerCase().includes(q);
        const cMatch = item.client?.name.toLowerCase().includes(q) || item.client?.company?.toLowerCase().includes(q);
        if (!pMatch && !cMatch) return false;
      }
      // Billing type filter
      if (selectedTypeFilter !== "all") {
        if (selectedTypeFilter === "fixed" && item.isHourly) return false;
        if (selectedTypeFilter === "hourly" && !item.isHourly) return false;
      }
      // Status filter
      if (selectedStatusFilter !== "all") {
        if (item.effectiveStatus !== selectedStatusFilter) return false;
      }
      // Client filter
      if (selectedClientFilter !== "all") {
        if (item.client?.id !== selectedClientFilter) return false;
      }
      return true;
    });
  }, [
    projectFinancials,
    search,
    selectedTypeFilter,
    selectedStatusFilter,
    selectedClientFilter,
  ]);

  // Overall KPI statistics
  const summaryKPIs = useMemo(() => {
    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;
    let totalHours = 0;
    let totalMilestones = 0;
    let paidMilestones = 0;

    projectFinancials.forEach((item) => {
      if (enableConversionPreview) {
        totalRevenue += item.convertedTotal;
        paidRevenue += item.convertedPaid;
        pendingRevenue += item.convertedPending;
      } else {
        totalRevenue += item.totalAmount;
        paidRevenue += item.paidAmount;
        pendingRevenue += item.pendingAmount;
      }
      totalHours += item.trackedHours;
      totalMilestones += item.totalInstallmentsCount;
      paidMilestones += item.paidInstallmentsCount;
    });

    const collectionPercentage =
      totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;
    const milestonePercentage =
      totalMilestones > 0 ? Math.round((paidMilestones / totalMilestones) * 100) : 0;

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      collectionPercentage,
      totalHours,
      totalMilestones,
      paidMilestones,
      milestonePercentage,
    };
  }, [projectFinancials, enableConversionPreview]);

  const targetCurInfo = getCurrencyInfo(targetCurrency);

  return (
    <div className="flex h-full flex-col space-y-4 overflow-y-auto pr-1">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Billing & Financials
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {projects.length} Projects
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Project contracts, milestone payment schedules, billable hourly labor & invoices
              </p>
            </div>
          </div>
        </div>

        {/* Global Live FX Rates Toggle Pill */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto bg-card border border-border/70 p-1.5 rounded-xl shadow-xs">
          <button
            onClick={() => setEnableConversionPreview(!enableConversionPreview)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              enableConversionPreview
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Multi-Currency Preview</span>
          </button>

          {enableConversionPreview && (
            <div className="flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="appearance-none bg-background border border-border/70 text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={refreshExchangeRates}
                disabled={isFetchingRates}
                title="Refresh Live Exchange Rates"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border transition-all"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isFetchingRates ? "animate-spin text-primary" : ""}`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Revenue */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Contract Value</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {enableConversionPreview
                ? formatCurrencyAmount(summaryKPIs.totalRevenue, targetCurrency)
                : `$${summaryKPIs.totalRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <Briefcase className="w-3 h-3 text-primary" />
            Across {projects.length} workspace projects
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-blue-500 opacity-60" />
        </div>

        {/* Card 2: Collected Revenue */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Settled & Paid</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {enableConversionPreview
                ? formatCurrencyAmount(summaryKPIs.paidRevenue, targetCurrency)
                : `$${summaryKPIs.paidRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {summaryKPIs.collectionPercentage}%
            </span>
          </div>
          <div className="w-full bg-muted/60 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summaryKPIs.collectionPercentage)}%` }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 opacity-60" />
        </div>

        {/* Card 3: Pending Receivables */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding Balance</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {enableConversionPreview
                ? formatCurrencyAmount(summaryKPIs.pendingRevenue, targetCurrency)
                : `$${summaryKPIs.pendingRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Awaiting settlement or milestone delivery
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 opacity-60" />
        </div>

        {/* Card 4: Billable Labor & Hours */}
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Billable Labor</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summaryKPIs.totalHours} hrs
            </span>
            <span className="text-xs text-muted-foreground">logged</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <Check className="w-3 h-3 text-indigo-500" />
            {summaryKPIs.paidMilestones}/{summaryKPIs.totalMilestones} Milestones Paid ({summaryKPIs.milestonePercentage}%)
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 opacity-60" />
        </div>
      </div>

      {/* View Sub-Tabs & Filter Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border/70 p-2.5 rounded-xl shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b md:border-b-0 pb-2 md:pb-0 border-border/50">
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "projects"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Projects & Milestones</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "invoices"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices & Receipts</span>
          </button>

          <button
            onClick={() => setActiveTab("hourly")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "hourly"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hourly Billable Tasks</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-48 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search project or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          {/* Billing Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="all">All Models</option>
            <option value="fixed">Fixed Price</option>
            <option value="hourly">Hourly Rate</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>

          {/* Client Filter */}
          {clients.length > 0 && (
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              className="text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Multi-currency Live Market Rate Notice */}
      {enableConversionPreview && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-primary" />
            <span>
              <strong>Real-Time Conversion Preview Active:</strong> All financial amounts are estimated in{" "}
              <strong>
                {targetCurInfo.flag} {targetCurInfo.name} ({targetCurInfo.code})
              </strong>{" "}
              using live market benchmarks.
            </span>
          </div>
          {lastRatesUpdated && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Rates updated: {new Date(lastRatesUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}

      {/* TAB 1: Projects & Milestones Directory */}
      {activeTab === "projects" && (
        <div className="space-y-3">
          {filteredProjectFinancials.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card">
              <Receipt className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No Billing Records Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                No projects matched your search or filters. Create projects or adjust your billing criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                    <tr>
                      <th className="py-3 px-4">Project & Client</th>
                      <th className="py-3 px-4">Billing Model</th>
                      <th className="py-3 px-4">Contract Price / Rate</th>
                      <th className="py-3 px-4">Settlement Progress</th>
                      <th className="py-3 px-4">Milestones / Logged</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredProjectFinancials.map((item) => {
                      const {
                        project,
                        client,
                        isHourly,
                        totalAmount,
                        paidAmount,
                        pendingAmount,
                        effectiveStatus,
                        trackedHours,
                        hourlyRate,
                        installments,
                        paidInstallmentsCount,
                        totalInstallmentsCount,
                        convertedTotal,
                        convertedPaid,
                        fxRate,
                      } = item;

                      const isExpanded = expandedProjectId === project.id;
                      const baseCurrency = project.currency || "$";

                      return (
                        <React.Fragment key={project.id}>
                          <tr className="hover:bg-muted/20 transition-colors group">
                            {/* Project & Client */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() =>
                                    setExpandedProjectId(isExpanded ? null : project.id)
                                  }
                                  className="text-muted-foreground hover:text-foreground transition-transform"
                                  title="Toggle Milestones Breakdown"
                                >
                                  <ChevronRight
                                    className={`w-4 h-4 transition-transform duration-200 ${
                                      isExpanded ? "rotate-90 text-primary" : ""
                                    }`}
                                  />
                                </button>
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: project.color || "#3b82f6" }}
                                />
                                <div className="min-w-0">
                                  <div
                                    onClick={() => {
                                      setSelectedProjectId(project.id);
                                      setActiveView("project_detail");
                                    }}
                                    className="font-semibold text-foreground hover:text-primary cursor-pointer truncate max-w-[200px]"
                                  >
                                    {project.name}
                                  </div>
                                  <div className="flex items-center space-x-1.5 mt-0.5 text-[11px] text-muted-foreground">
                                    {client ? (
                                      <div className="flex items-center space-x-1">
                                        <ClientAvatar client={client} size="xs" />
                                        <span className="font-medium text-foreground/80 truncate max-w-[120px]">
                                          {client.name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="italic text-muted-foreground/70">No client linked</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Billing Model */}
                            <td className="py-3.5 px-4">
                              {isHourly ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  <Clock className="w-3 h-3" />
                                  <span>Hourly Labor</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <DollarSign className="w-3 h-3" />
                                  <span>Fixed Milestone</span>
                                </span>
                              )}
                            </td>

                            {/* Contract Price / Rate */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-foreground">
                                {isHourly ? (
                                  <span>
                                    {formatCurrencyAmount(hourlyRate, baseCurrency)}/hr
                                  </span>
                                ) : (
                                  <span>
                                    {formatCurrencyAmount(totalAmount, baseCurrency)}
                                  </span>
                                )}
                              </div>
                              {enableConversionPreview && (
                                <div className="text-[11px] text-primary font-medium mt-0.5">
                                  ≈ {formatCurrencyAmount(convertedTotal, targetCurrency)}
                                </div>
                              )}
                            </td>

                            {/* Settlement Progress */}
                            <td className="py-3.5 px-4 min-w-[150px]">
                              <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {formatCurrencyAmount(paidAmount, baseCurrency)}
                                </span>
                                <span className="text-muted-foreground">
                                  {totalAmount > 0
                                    ? Math.round((paidAmount / totalAmount) * 100)
                                    : 0}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${
                                      totalAmount > 0
                                        ? Math.min(100, (paidAmount / totalAmount) * 100)
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </td>

                            {/* Milestones / Logged */}
                            <td className="py-3.5 px-4">
                              {isHourly ? (
                                <div className="text-[11px]">
                                  <span className="font-semibold text-foreground">
                                    {trackedHours} hrs
                                  </span>{" "}
                                  <span className="text-muted-foreground">tracked</span>
                                </div>
                              ) : (
                                <div className="text-[11px]">
                                  <span className="font-semibold text-foreground">
                                    {paidInstallmentsCount} of {totalInstallmentsCount}
                                  </span>{" "}
                                  <span className="text-muted-foreground">paid</span>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {effectiveStatus === "paid" ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Paid in Full</span>
                                </span>
                              ) : effectiveStatus === "partially_paid" ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Clock className="w-3 h-3" />
                                  <span>Partially Paid</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Unpaid</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => setEditingBillingProject(project)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/60 transition-all shadow-xs"
                                >
                                  Edit Billing
                                </button>
                                <button
                                  onClick={() => setInvoicingProject(project)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center space-x-1"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Invoice</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Milestones / Payment Breakdown Accordion */}
                          {isExpanded && (
                            <tr className="bg-muted/10">
                              <td colSpan={7} className="p-4 border-t border-border/40">
                                <div className="space-y-3 pl-8">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-primary" />
                                      {isHourly
                                        ? "Hourly Labor & Logged Sessions"
                                        : "Project Payment Milestones & Installments"}
                                    </h4>
                                    <button
                                      onClick={() => setEditingBillingProject(project)}
                                      className="text-xs text-primary hover:underline font-semibold"
                                    >
                                      Configure Milestone Schedule
                                    </button>
                                  </div>

                                  {!isHourly ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                      {installments.length > 0 ? (
                                        installments.map((inst) => {
                                          const isPaid = inst.status === "paid";
                                          return (
                                            <div
                                              key={inst.id}
                                              className={`p-3 rounded-xl border text-xs transition-all ${
                                                isPaid
                                                  ? "bg-emerald-500/5 border-emerald-500/30"
                                                  : "bg-card border-border/70"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between font-semibold">
                                                <span>
                                                  Milestone #{inst.installment_number}: {inst.title}
                                                </span>
                                                <button
                                                  onClick={() =>
                                                    toggleInstallmentPaid(
                                                      project.id,
                                                      inst.installment_number
                                                    )
                                                  }
                                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                                    isPaid
                                                      ? "bg-emerald-500 text-white"
                                                      : "bg-muted text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-600"
                                                  }`}
                                                >
                                                  {isPaid ? "Paid ✓" : "Mark Paid"}
                                                </button>
                                              </div>
                                              <div className="text-sm font-bold text-foreground mt-1">
                                                {formatCurrencyAmount(inst.amount, baseCurrency)}
                                                {enableConversionPreview && (
                                                  <span className="text-[11px] text-primary ml-1.5 font-normal">
                                                    (≈{" "}
                                                    {formatCurrencyAmount(
                                                      inst.amount * fxRate,
                                                      targetCurrency
                                                    )}
                                                    )
                                                  </span>
                                                )}
                                              </div>
                                              {inst.due_date && (
                                                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                                  <Calendar className="w-3 h-3" /> Due{" "}
                                                  {formatDate(inst.due_date)}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="col-span-full py-3 px-4 rounded-xl bg-muted/40 text-muted-foreground text-xs">
                                          Single installment payment of{" "}
                                          <strong>{formatCurrencyAmount(totalAmount, baseCurrency)}</strong>.
                                          Status is currently <strong>{effectiveStatus}</strong>.
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">
                                      Tracked <strong>{trackedHours} hours</strong> at{" "}
                                      <strong>{formatCurrencyAmount(hourlyRate, baseCurrency)}/hr</strong>.
                                      Total accrued billable:{" "}
                                      <strong className="text-foreground">
                                        {formatCurrencyAmount(totalAmount, baseCurrency)}
                                      </strong>
                                      .
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Invoices Directory */}
      {activeTab === "invoices" && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Project & Client</th>
                    <th className="py-3 px-4">Billing Model</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredProjectFinancials.map((item) => {
                    const invoiceNum = `INV-VINZ-${item.project.id.slice(0, 6).toUpperCase()}`;
                    const baseCurrency = item.project.currency || "$";

                    return (
                      <tr key={item.project.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-primary">
                          {invoiceNum}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">
                            {item.project.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.client ? item.client.name : "Internal Workspace"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize">{item.project.billing_type || "fixed"}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold">
                            {formatCurrencyAmount(item.totalAmount, baseCurrency)}
                          </div>
                          {enableConversionPreview && (
                            <div className="text-[11px] text-primary">
                              ≈ {formatCurrencyAmount(item.convertedTotal, targetCurrency)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.effectiveStatus === "paid" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Paid
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Issued / Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInvoicingProject(item.project)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center space-x-1.5 ml-auto"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View / Print PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Hourly Billable Tasks */}
      {activeTab === "hourly" && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/70">
                  <tr>
                    <th className="py-3 px-4">Task Name</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Tracked Time</th>
                    <th className="py-3 px-4">Hourly Rate</th>
                    <th className="py-3 px-4">Accrued Amount</th>
                    <th className="py-3 px-4">Settlement</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {tasks
                    .filter((t) => {
                      const proj = projects.find((p) => p.id === t.project_id);
                      return proj && (t.tracked_seconds || 0) > 0;
                    })
                    .map((task) => {
                      const proj = projects.find((p) => p.id === task.project_id);
                      if (!proj) return null;
                      const hours = Math.round(((task.tracked_seconds || 0) / 3600) * 10) / 10;
                      const rate = proj.hourly_rate || 0;
                      const billableAmount = hours * rate;
                      const baseCurrency = proj.currency || "$";

                      return (
                        <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {task.title}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {proj.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {hours} hrs
                          </td>
                          <td className="py-3.5 px-4">
                            {formatCurrencyAmount(rate, baseCurrency)}/hr
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {formatCurrencyAmount(billableAmount, baseCurrency)}
                          </td>
                          <td className="py-3.5 px-4">
                            {task.is_paid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                                Settled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                                Unsettled
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setInvoicingProject(proj)}
                              className="text-xs text-primary hover:underline font-semibold"
                            >
                              Include in Invoice
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Billing Modal */}
      {editingBillingProject && (
        <EditProjectBillingModal
          isOpen={!!editingBillingProject}
          onClose={() => setEditingBillingProject(null)}
          project={editingBillingProject}
        />
      )}

      {/* Project Invoice & Printable PDF Modal */}
      {invoicingProject && (
        <ProjectInvoiceModal
          isOpen={!!invoicingProject}
          onClose={() => setInvoicingProject(null)}
          project={invoicingProject}
        />
      )}
    </div>
  );
}
