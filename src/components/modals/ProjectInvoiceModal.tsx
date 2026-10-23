"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Printer,
  Download,
  Receipt,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  Clock,
  FileText,
  DollarSign,
  Share2,
  ArrowRightLeft,
  Globe,
  RefreshCw,
  Edit3,
  Eye,
  Plus,
  Trash2,
  ShieldCheck,
  Copy,
  Sparkles,
  CalendarDays,
  Layers,
  Landmark,
  User,
  Mail,
  MapPin,
  Percent,
  Check,
} from "lucide-react";
import { Project, ProjectInvoiceItem, PaymentSchedule, Client } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatDate } from "@/lib/utils";
import {
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
  getDefaultExchangeRate,
  fetchRealtimeExchangeRate,
  formatCurrencyAmount,
} from "@/lib/currencyRates";
import { ClientAvatar } from "@/components/common/ClientAvatar";

interface ProjectInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function ProjectInvoiceModal({
  isOpen,
  onClose,
  project,
}: ProjectInvoiceModalProps) {
  const { tasks, activeWorkspace, users, clients, toast, togglePaymentPaid, updateProject } = useStore();

  // Mode: "preview" (Executive Printable Document) vs "form" (Interactive Invoice Form Editor)
  const [activeTab, setActiveTab] = useState<"preview" | "form">("preview");

  // Invoice Metadata
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule>("30_days");
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [dueDate, setDueDate] = useState<string>("");
  const [invoiceStatus, setInvoiceStatus] = useState<"Draft" | "Issued" | "Paid" | "Overdue">("Issued");

  // Client Details
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientCompany, setClientCompany] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientAddress, setClientAddress] = useState<string>("");
  const [clientTaxId, setClientTaxId] = useState<string>("");

  // Originating Entity (Agency Details)
  const [providerCompany, setProviderCompany] = useState<string>("");
  const [providerEmail, setProviderEmail] = useState<string>("billing@vinzmedia.com");
  const [providerAddress, setProviderAddress] = useState<string>("Suite 2400, Horizon Executive Tower");
  const [providerTaxId, setProviderTaxId] = useState<string>("US-EIN-94-2849102");

  // Bank & Wire Remittance Instructions
  const [paymentMethod, setPaymentMethod] = useState<string>("Direct Bank Wire / ACH");
  const [bankName, setBankName] = useState<string>("JPMorgan Chase Bank, N.A.");
  const [accountName, setAccountName] = useState<string>("VinzMedia Global Operations LLC");
  const [accountNumber, setAccountNumber] = useState<string>("0482 9182 4819 028");
  const [swiftBic, setSwiftBic] = useState<string>("CHASUS33AXX");
  const [routingNumber, setRoutingNumber] = useState<string>("021000021");
  const [notes, setNotes] = useState<string>("");

  // Line Items
  const [lineItems, setLineItems] = useState<ProjectInvoiceItem[]>([]);

  // Taxes & Discounts
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Currency Conversion state & Real-time Live Market Rates
  const [enableConversion, setEnableConversion] = useState<boolean>(false);
  const [targetCurrency, setTargetCurrency] = useState<string>("PHP");
  const [conversionRate, setConversionRate] = useState<string>("1.0");
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);
  const [isLiveRate, setIsLiveRate] = useState<boolean>(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string>("");

  const [copiedInvoiceNumber, setCopiedInvoiceNumber] = useState(false);

  // Compute helper to calculate due date given issueDate & schedule days
  const computeDueDate = (baseIssueDate: string, days: number): string => {
    try {
      const d = new Date(baseIssueDate || Date.now());
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    } catch {
      return baseIssueDate;
    }
  };

  // Helper to construct initial line items from project
  const buildInitialLineItems = (proj: Project): ProjectInvoiceItem[] => {
    const isFixed = proj.billing_type === "fixed";
    const cur = proj.currency || "$";

    if (isFixed) {
      if (proj.installments && proj.installments.length > 0) {
        return proj.installments.map((inst, idx) => ({
          id: inst.id || `item_${idx + 1}`,
          description: inst.title || `Payment Milestone #${idx + 1}`,
          quantity: 1,
          rate: Number(inst.amount) || 0,
          amount: Number(inst.amount) || 0,
        }));
      }
      const fixedTotal = Number(proj.fixed_price_amount) || 5000;
      const count = proj.payment_installments_count || 1;
      const perAmt = Math.round((fixedTotal / count) * 100) / 100;
      return Array.from({ length: count }).map((_, idx) => ({
        id: `item_${idx + 1}`,
        description:
          idx === 0
            ? "Upfront Project Kickoff & Initialization"
            : idx === count - 1
            ? "Final Delivery & Handover Sign-off"
            : `Milestone Phase #${idx + 1} Progress Delivery`,
        quantity: 1,
        rate: perAmt,
        amount: perAmt,
      }));
    } else {
      // Hourly Time & Materials
      const items: ProjectInvoiceItem[] = [];
      const rate = Number(proj.hourly_rate) || 75;
      const hoursPerWk = Number(proj.estimated_hours_per_week || proj.estimated_hours || 40);

      items.push({
        id: "item_weekly_capacity",
        description: `Dedicated Developer Capacity Commitment (${hoursPerWk} billable hours/cycle)`,
        quantity: hoursPerWk,
        rate: rate,
        amount: Math.round(hoursPerWk * rate * 100) / 100,
      });

      // Also add any tasks that have logged hours
      const projectTasks = tasks.filter((t) => t.project_id === proj.id && (t.tracked_seconds || 0) > 0);
      projectTasks.slice(0, 5).forEach((task) => {
        const hrs = Math.round(((task.tracked_seconds || 0) / 3600) * 10) / 10;
        if (hrs > 0) {
          items.push({
            id: `task_${task.id}`,
            description: `Deliverable: ${task.title}`,
            quantity: hrs,
            rate: rate,
            amount: Math.round(hrs * rate * 100) / 100,
          });
        }
      });

      return items;
    }
  };

  // Initialize all form state on modal open
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setIssueDate(today);

      const generatedNum = `INV-${project.id.slice(0, 6).toUpperCase()}-${new Date().getFullYear()}`;
      setInvoiceNumber(generatedNum);

      const sched = project.payment_schedule || "30_days";
      setPaymentSchedule(sched);

      const days =
        project.payment_terms_days ||
        (sched === "weekly" ? 7 : sched === "15_days" ? 15 : 30);
      setPaymentTermsDays(days);

      const calculatedDue = project.target_date || computeDueDate(today, days);
      setDueDate(calculatedDue);

      setInvoiceStatus(project.payment_status === "paid" ? "Paid" : "Issued");

      // Linked Client
      const linked = clients.find((c) => c.id === project.client_id);
      setSelectedClientId(project.client_id || "");
      if (linked) {
        setClientCompany(linked.company || linked.name || project.name);
        setClientName(linked.name || "");
        setClientEmail(linked.email || "");
        setClientAddress(linked.address || "Corporate Client Accounts Dept.");
        setClientTaxId(linked.tax_id || "");
      } else {
        setClientCompany(project.name);
        setClientName("Accounting / Operations Lead");
        setClientEmail("");
        setClientAddress("");
        setClientTaxId("");
      }

      // Agency Provider
      const wsName = activeWorkspace?.name || "VinzMedia Platform";
      setProviderCompany(`${wsName} Agency Solutions`);

      // Notes
      setNotes(
        `Payment is due within ${days} days of invoice date (${sched === "weekly" ? "Weekly Payment" : sched === "15_days" ? "Every 15 Days / Semi-Monthly" : "30 Days / Monthly"}). Please reference invoice #${generatedNum} on all remittances.`
      );

      // Line Items
      setLineItems(buildInitialLineItems(project));
      setTaxRate(0);
      setDiscountAmount(0);

      // Conversion
      setEnableConversion(project.enable_currency_conversion || false);
      const targetCurr = project.converted_currency || "PHP";
      setTargetCurrency(targetCurr);
      setConversionRate(
        project.conversion_rate
          ? String(project.conversion_rate)
          : String(getDefaultExchangeRate(project.currency || "$", targetCurr))
      );

      if (project.enable_currency_conversion) {
        updateRateInRealtime(targetCurr);
      }
    }
  }, [isOpen, project]);

  // Handle schedule change
  const handleScheduleChange = (newSched: PaymentSchedule) => {
    setPaymentSchedule(newSched);
    let days = 30;
    if (newSched === "weekly") days = 7;
    else if (newSched === "15_days") days = 15;
    else if (newSched === "30_days") days = 30;
    else days = paymentTermsDays;

    setPaymentTermsDays(days);
    const newDue = computeDueDate(issueDate, days);
    setDueDate(newDue);

    setNotes(
      `Payment is due within ${days} days of invoice date (${newSched === "weekly" ? "Weekly Payment" : newSched === "15_days" ? "Every 15 Days / Semi-Monthly" : "30 Days / Monthly"}). Please reference invoice #${invoiceNumber} on all remittances.`
    );
  };

  // Handle issue date change
  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    const newDue = computeDueDate(newDate, paymentTermsDays);
    setDueDate(newDue);
  };

  // Client Selection Change
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const selected = clients.find((c) => c.id === clientId);
    if (selected) {
      setClientCompany(selected.company || selected.name);
      setClientName(selected.name || "");
      setClientEmail(selected.email || "");
      setClientAddress(selected.address || "Corporate Client Accounts");
      setClientTaxId(selected.tax_id || "");
    }
  };

  // Real-time rate sync
  const updateRateInRealtime = async (targetCurr: string) => {
    setIsLoadingRate(true);
    try {
      const res = await fetchRealtimeExchangeRate(project.currency || "$", targetCurr);
      setConversionRate(String(res.rate));
      setIsLiveRate(res.isLive);
      setRateUpdatedAt(res.lastUpdated || "Live");
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleTargetCurrencyChange = (newTarget: string) => {
    setTargetCurrency(newTarget);
    updateRateInRealtime(newTarget);
  };

  const handleResetRate = () => {
    updateRateInRealtime(targetCurrency);
  };

  // Line item manipulations
  const handleAddLineItem = () => {
    const newItem: ProjectInvoiceItem = {
      id: `item_${Date.now()}`,
      description: "Additional Technical Consulting & Deliverables",
      quantity: 1,
      rate: 250,
      amount: 250,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleUpdateLineItem = (index: number, updates: Partial<ProjectInvoiceItem>) => {
    setLineItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const merged = { ...item, ...updates };
        const q = merged.quantity !== undefined ? Number(merged.quantity) : 1;
        const r = merged.rate !== undefined ? Number(merged.rate) : 0;
        merged.amount = Math.round(q * r * 100) / 100;
        return merged;
      })
    );
  };

  const handleDeleteLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      toast?.error("Cannot Remove", "An invoice must contain at least one line item.");
      return;
    }
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleResetLineItems = () => {
    setLineItems(buildInitialLineItems(project));
    toast?.success("Reset", "Line items restored to project milestone defaults.");
  };

  // Financial Calculations
  const currencySymbol = project.currency || "$";
  const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const calculatedTax = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
  const finalTotal = Math.max(0, subtotal - discountAmount + calculatedTax);

  const parsedFxRate = parseFloat(conversionRate) || 1.0;
  const targetCurrencyInfo = getCurrencyInfo(targetCurrency);
  const convertedFinalTotal = finalTotal * parsedFxRate;

  // Status handler
  const handleStatusChange = (newStatus: "Draft" | "Issued" | "Paid" | "Overdue") => {
    setInvoiceStatus(newStatus);
    if (newStatus === "Paid") {
      togglePaymentPaid(project.id, true);
      toast?.success("Marked Paid", `Project ${project.name} payment registered.`);
    } else if (invoiceStatus === "Paid") {
      togglePaymentPaid(project.id, false);
    }
  };

  // Save invoice settings to project
  const handleSaveToProject = () => {
    try {
      updateProject(project.id, {
        payment_schedule: paymentSchedule,
        payment_terms_days: paymentTermsDays,
        enable_currency_conversion: enableConversion,
        converted_currency: targetCurrency,
        conversion_rate: parsedFxRate,
        client_id: selectedClientId || undefined,
      });
      toast?.success("Invoice Settings Saved", "Payment terms & billing cycle updated on project.");
      setActiveTab("preview");
    } catch (err: any) {
      toast?.error("Error", err?.message || "Failed to save invoice settings.");
    }
  };

  const handleCopyInvoiceNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(invoiceNumber);
      setCopiedInvoiceNumber(true);
      setTimeout(() => setCopiedInvoiceNumber(false), 2000);
      toast?.success("Copied", `Invoice #${invoiceNumber} copied to clipboard`);
    }
  };

  const handlePrint = () => {
    // Switch to preview mode for printing if in form mode
    if (activeTab !== "preview") {
      setActiveTab("preview");
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
        onClick={onClose}
      >
        {/* Print Stylesheet */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #invoice-printable-area, #invoice-printable-area * {
                visibility: visible;
              }
              #invoice-printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 32px !important;
                background: #ffffff !important;
                color: #0f172a !important;
                box-shadow: none !important;
                border: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `
        }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col my-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Action Bar (Hidden in Print) */}
          <div className="no-print flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-border/80 bg-secondary/30 shrink-0 gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-foreground">
                    Corporate Billing Invoice
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {paymentSchedule === "weekly"
                      ? "Weekly • Net 7"
                      : paymentSchedule === "15_days"
                      ? "15 Days • Net 15"
                      : paymentSchedule === "30_days"
                      ? "30 Days • Net 30"
                      : `Net ${paymentTermsDays}`}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Project: <span className="font-semibold text-foreground">{project.name}</span>
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-background border border-border rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-[#0073ea] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Executive Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "form"
                    ? "bg-[#0073ea] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Invoice Form Editor</span>
              </button>
            </div>

            {/* Actions: Status Dropdown & Print */}
            <div className="flex items-center space-x-2">
              <select
                value={invoiceStatus}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-2.5 py-1 text-xs text-foreground font-semibold cursor-pointer shadow-2xs"
              >
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Paid">Mark as Paid</option>
                <option value="Overdue">Overdue</option>
              </select>

              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3 py-1 bg-[#0073ea] hover:bg-[#0060c0] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="Download as PDF or Print"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Payment Schedule & Currency Bar (Hidden in Print) */}
          <div className="no-print px-4 sm:px-6 py-2 bg-secondary/20 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            {/* Quick Payment Cycle Selector */}
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-foreground flex items-center space-x-1.5 text-xs">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span>Billing Cycle:</span>
              </span>
              <div className="flex items-center space-x-1">
                {[
                  { key: "weekly", label: "Weekly (Net 7)", emoji: "🗓️" },
                  { key: "15_days", label: "Every 15 Days (Net 15)", emoji: "🌓" },
                  { key: "30_days", label: "30 Days (Net 30)", emoji: "🌕" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleScheduleChange(s.key as PaymentSchedule)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                      paymentSchedule === s.key
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Conversion Switch */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5">
                <ArrowRightLeft className="w-3 h-3 text-primary" />
                <span className="text-[11px] font-semibold text-foreground">Currency Conversion:</span>
              </div>
              <button
                type="button"
                onClick={() => setEnableConversion(!enableConversion)}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  enableConversion ? "bg-[#0073ea]" : "bg-muted-foreground/30"
                }`}
                role="switch"
                aria-checked={enableConversion}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enableConversion ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>

              {enableConversion && (
                <div className="flex items-center space-x-1.5">
                  <select
                    value={targetCurrency}
                    onChange={(e) => handleTargetCurrencyChange(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-0.5 text-xs text-foreground cursor-pointer font-medium"
                  >
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.flag} {curr.code} ({curr.symbol})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleResetRate}
                    disabled={isLoadingRate}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer flex items-center space-x-1"
                    title="Sync real-time rate"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isLoadingRate ? "animate-spin" : ""}`} />
                    <span>{isLoadingRate ? "..." : "Live"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT AREA: TAB 1 (FORM EDITOR) OR TAB 2 (PREVIEW) */}
          {activeTab === "form" ? (
            /* ================= INVOICE FORM EDITOR MODE ================= */
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-background">
              {/* Section 1: Invoice Identification & Schedule */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground">Invoice Metadata & Payment Terms</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Adjust invoice header & timing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Invoice Number</label>
                    <div className="flex items-center rounded-xl border border-border bg-background overflow-hidden">
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full bg-transparent px-3 py-1.5 text-xs font-mono font-bold text-foreground outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => handleIssueDateChange(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Payment Schedule</label>
                    <select
                      value={paymentSchedule}
                      onChange={(e) => handleScheduleChange(e.target.value as PaymentSchedule)}
                      className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground cursor-pointer font-medium"
                    >
                      <option value="weekly">Weekly Payment (Net 7 Days)</option>
                      <option value="15_days">Every 15 Days (Net 15 Days / Semi-Monthly)</option>
                      <option value="30_days">30 Days Payment (Net 30 Days / Monthly)</option>
                      <option value="custom">Custom Terms</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono font-bold text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Parties Information (Client & Provider) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Billed To (Client) */}
                <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground">Billed To (Client / Recipient)</h3>
                    </div>
                    {clients.length > 0 && (
                      <select
                        value={selectedClientId}
                        onChange={(e) => handleClientSelect(e.target.value)}
                        className="text-[10px] bg-background border border-border rounded-lg px-2 py-0.5 text-foreground cursor-pointer"
                      >
                        <option value="">Load from Client List...</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company || c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Company Name</label>
                        <input
                          type="text"
                          value={clientCompany}
                          onChange={(e) => setClientCompany(e.target.value)}
                          placeholder="e.g. Acme Innovations Corp"
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Attention / Contact</label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Billing Email</label>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="finance@acme.com"
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Tax ID / VAT #</label>
                        <input
                          type="text"
                          value={clientTaxId}
                          onChange={(e) => setClientTaxId(e.target.value)}
                          placeholder="e.g. US-VAT-90218"
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">Billing Street & City Address</label>
                      <input
                        type="text"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        placeholder="100 Innovation Way, Suite 400"
                        className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Billed From (VinzMedia Agency Entity) */}
                <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground">Originating Entity (Provider)</h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Remittance Origin</span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Provider Agency</label>
                        <input
                          type="text"
                          value={providerCompany}
                          onChange={(e) => setProviderCompany(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Registration / EIN</label>
                        <input
                          type="text"
                          value={providerTaxId}
                          onChange={(e) => setProviderTaxId(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Remittance Email</label>
                        <input
                          type="email"
                          value={providerEmail}
                          onChange={(e) => setProviderEmail(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-muted-foreground">Office Address</label>
                        <input
                          type="text"
                          value={providerAddress}
                          onChange={(e) => setProviderAddress(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                        />
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-[10px] text-primary flex items-center justify-between">
                      <span>Agency Verified Provider Status: Active</span>
                      <span className="font-mono font-bold">VinzMedia Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Itemized Line Items Table Editor */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground">Itemized Services & Deliverables</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {lineItems.length} {lineItems.length === 1 ? "Item" : "Items"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleResetLineItems}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                    >
                      Reset to Defaults
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Line Item</span>
                    </button>
                  </div>
                </div>

                {/* Line Items List */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                    <div className="col-span-6">Description / Milestone</div>
                    <div className="col-span-2 text-center">Qty / Hours</div>
                    <div className="col-span-2 text-right">Rate ({currencySymbol})</div>
                    <div className="col-span-2 text-right">Line Total</div>
                  </div>

                  {lineItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-background border border-border/80 shadow-2xs group"
                    >
                      {/* Description */}
                      <div className="col-span-6 flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-4">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(index, { description: e.target.value })}
                          placeholder="Specification or Milestone Title"
                          className="w-full bg-transparent border-none text-xs text-foreground font-medium focus:ring-0 outline-none"
                        />
                      </div>

                      {/* Quantity / Hours */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.quantity ?? 1}
                          onChange={(e) => handleUpdateLineItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-secondary/30 border border-border/70 rounded-lg px-2 py-1 text-xs text-foreground text-center font-mono"
                        />
                      </div>

                      {/* Unit Rate */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate ?? 0}
                          onChange={(e) => handleUpdateLineItem(index, { rate: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-secondary/30 border border-border/70 rounded-lg px-2 py-1 text-xs text-foreground text-right font-mono"
                        />
                      </div>

                      {/* Amount & Delete */}
                      <div className="col-span-2 flex items-center justify-end space-x-2">
                        <span className="font-mono font-bold text-xs text-foreground">
                          {currencySymbol}
                          {Number(item.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteLineItem(index)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals & Taxes Adjustments */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-border/60">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-bold text-foreground">Settlement Terms Note:</p>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add remittance memo, wire instructions, or invoice notes..."
                      className="w-full sm:w-80 bg-background border border-border rounded-lg p-2 text-xs text-foreground resize-none"
                    />
                  </div>

                  <div className="w-full sm:w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {currencySymbol}
                        {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <span>Tax / VAT (%):</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-12 bg-background border border-border rounded px-1 text-xs text-foreground text-right font-mono"
                        />
                      </div>
                      <span className="font-mono text-foreground">
                        +{currencySymbol}{calculatedTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <span>Discount ({currencySymbol}):</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          className="w-16 bg-background border border-border rounded px-1 text-xs text-foreground text-right font-mono"
                        />
                      </div>
                      <span className="font-mono text-foreground">
                        -{currencySymbol}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-t-2 border-primary/40 font-bold text-sm text-foreground">
                      <span>Total Due:</span>
                      <span className="font-mono text-base text-primary">
                        {currencySymbol}
                        {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Bank Remittance Details */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center space-x-2">
                    <Landmark className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground">Wire Remittance & Banking Information</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Beneficiary Details for Client Payments</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Beneficiary Bank</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Account / IBAN Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">SWIFT / BIC Code</label>
                    <input
                      type="text"
                      value={swiftBic}
                      onChange={(e) => setSwiftBic(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Routing / Sort Code</label>
                    <input
                      type="text"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Payment Method</label>
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex items-center justify-end space-x-2 pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveToProject}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-[#0073ea] hover:bg-[#0060c0] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Invoice & View Preview</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= EXECUTIVE PREVIEW (PRINTABLE A4 DOCUMENT) ================= */
            <div
              id="invoice-printable-area"
              className="p-5 sm:p-8 space-y-5 bg-card text-foreground overflow-y-auto flex-1 font-sans"
            >
              {/* Top Executive Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-border/90">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0073ea] flex items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-primary/30">
                      VM
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                        {providerCompany || "VinzMedia Enterprise Solutions"}
                      </h1>
                      <p className="text-[11px] text-muted-foreground tracking-wide font-medium">
                        Professional Software Development & Digital Infrastructure
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-0.5 space-y-0.5">
                    <p>{providerAddress}</p>
                    <p>
                      Tax / Registration: <span className="font-mono text-foreground font-semibold">{providerTaxId}</span> • Remittance: {providerEmail}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1 sm:self-auto self-end">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-[#0073ea]">
                    INVOICE
                  </h2>
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-xs font-mono font-bold text-foreground">
                      #{invoiceNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyInvoiceNumber}
                      className="no-print p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy Invoice #"
                    >
                      {copiedInvoiceNumber ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="inline-flex items-center space-x-1.5 mt-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        invoiceStatus === "Paid"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : invoiceStatus === "Overdue"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      ● Status: {invoiceStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Schedule Executive Banner */}
              <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/80 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-base">
                    {paymentSchedule === "weekly" ? "🗓️" : paymentSchedule === "15_days" ? "🌓" : "🌕"}
                  </span>
                  <div>
                    <span className="font-bold text-foreground">
                      Payment Schedule:{" "}
                      <span className="text-[#0073ea]">
                        {paymentSchedule === "weekly"
                          ? "Weekly Payment (Net 7 Days)"
                          : paymentSchedule === "15_days"
                          ? "Every 15 Days (Net 15 Days / Semi-Monthly)"
                          : paymentSchedule === "30_days"
                          ? "30 Days Payment (Net 30 Days / Monthly)"
                          : `Custom (Net ${paymentTermsDays} Days)`}
                      </span>
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      Contractual settlement mature on due date indicated below.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Maturity Date:</span>
                  <span className="font-mono font-bold text-xs text-[#0073ea]">
                    {formatDate(dueDate)}
                  </span>
                </div>
              </div>

              {/* Party Information Grid (Billed To vs Specifics) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
                {/* Billed To */}
                <div className="space-y-1 sm:col-span-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] block">
                    Billed To / Client Recipient
                  </span>
                  <p className="font-black text-sm text-foreground">
                    {clientCompany || project.name}
                  </p>
                  {clientName && (
                    <p className="text-muted-foreground font-medium">Attn: {clientName}</p>
                  )}
                  {clientEmail && (
                    <p className="text-muted-foreground font-mono text-[11px]">{clientEmail}</p>
                  )}
                  {clientAddress && (
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{clientAddress}</p>
                  )}
                  {clientTaxId && (
                    <p className="text-[10px] text-muted-foreground font-mono pt-0.5">
                      Tax/VAT: <span className="font-semibold text-foreground">{clientTaxId}</span>
                    </p>
                  )}
                </div>

                {/* Project Context */}
                <div className="space-y-1 sm:col-span-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] block">
                    Project & Engagement
                  </span>
                  <p className="font-bold text-xs text-foreground">{project.name}</p>
                  <p className="text-muted-foreground text-[11px] line-clamp-2">
                    {project.description || "Milestone deliverables & engineering services"}
                  </p>
                  <div className="pt-1">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-foreground border border-border/60">
                      Model: {project.billing_type === "fixed" ? "Fixed Contract" : "Time & Materials"}
                    </span>
                  </div>
                </div>

                {/* Dates & Currency */}
                <div className="space-y-1 sm:text-right sm:col-span-1">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] block">
                    Invoice Details
                  </span>
                  <p className="text-foreground text-[11px]">
                    <span className="text-muted-foreground">Issue Date:</span>{" "}
                    <span className="font-semibold font-mono">{formatDate(issueDate)}</span>
                  </p>
                  <p className="text-foreground text-[11px]">
                    <span className="text-muted-foreground">Due Date:</span>{" "}
                    <span className="font-bold font-mono text-[#0073ea]">{formatDate(dueDate)}</span>
                  </p>
                  <p className="text-foreground text-[11px]">
                    <span className="text-muted-foreground">Currency:</span>{" "}
                    <span className="font-mono font-bold text-foreground">{currencySymbol} ({project.currency || "USD"})</span>
                  </p>
                  {enableConversion && (
                    <p className="text-[10px] font-mono text-[#0073ea] font-semibold pt-0.5">
                      💱 1 {currencySymbol} = {parsedFxRate} {targetCurrency}
                    </p>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-border/90 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-secondary/60 border-b border-border/80 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                      <th className="py-2.5 px-3.5">Service Description / Milestone Deliverable</th>
                      <th className="py-2.5 px-3.5 text-center w-28">Quantity / Qty</th>
                      <th className="py-2.5 px-3.5 text-right w-32">Rate ({currencySymbol})</th>
                      <th className="py-2.5 px-3.5 text-right w-36">Amount ({currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-secondary/15 transition-colors">
                        <td className="py-2.5 px-3.5 text-center font-mono text-[11px] text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <p className="font-bold text-xs text-foreground">{item.description}</p>
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-[11px] text-muted-foreground">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-xs">
                          {currencySymbol}
                          {(Number(item.rate) || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-xs text-foreground">
                          {currencySymbol}
                          {(Number(item.amount) || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary & Banking Wire Instructions */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-5 pt-1">
                {/* Remittance & Bank Instructions */}
                <div className="text-[11px] text-muted-foreground max-w-sm space-y-2">
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/70 space-y-1.5">
                    <p className="font-bold text-xs text-foreground flex items-center space-x-1.5">
                      <Landmark className="w-3.5 h-3.5 text-primary" />
                      <span>Remittance & Wire Transfer Details:</span>
                    </p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                      <div>
                        <span className="text-muted-foreground block">Beneficiary Bank:</span>
                        <span className="font-bold text-foreground">{bankName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Account Holder:</span>
                        <span className="font-bold text-foreground">{accountName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Account / IBAN:</span>
                        <span className="font-mono font-bold text-foreground">{accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">SWIFT / BIC:</span>
                        <span className="font-mono font-bold text-foreground uppercase">{swiftBic}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      Memo / Reference: <span className="font-mono font-bold text-foreground">#{invoiceNumber}</span>
                    </p>
                  </div>

                  {/* Multi-Currency Settlement Notice */}
                  {enableConversion && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-[10px] text-blue-900 dark:text-blue-200">
                      <p className="font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Multi-Currency Remittance Notice:</span>
                      </p>
                      <p className="mt-0.5 leading-relaxed">
                        Clients remitting in <strong>{targetCurrencyInfo.name} ({targetCurrency})</strong> may pay{" "}
                        <strong className="font-mono text-foreground">
                          {targetCurrencyInfo.symbol}
                          {convertedFinalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetCurrency}
                        </strong>{" "}
                        at the guaranteed locked exchange rate of <strong>1 {currencySymbol} = {parsedFxRate} {targetCurrency}</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Subtotal, Tax & Total Box */}
                <div className="w-full sm:w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 text-muted-foreground text-[11px]">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {currencySymbol}
                      {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {taxRate > 0 && (
                    <div className="flex justify-between py-0.5 text-muted-foreground text-[11px]">
                      <span>Tax / VAT ({taxRate}%):</span>
                      <span className="font-mono text-foreground">
                        +{currencySymbol}{calculatedTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between py-0.5 text-emerald-600 dark:text-emerald-400 text-[11px]">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">
                        -{currencySymbol}{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 border-t-2 border-foreground/90 font-bold text-xs text-foreground">
                    <span>Total Amount Due:</span>
                    <span className="font-mono text-base text-[#0073ea]">
                      {currencySymbol}
                      {finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Highlighted Converted Payable Total Card */}
                  {enableConversion && (
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 text-foreground space-y-1 mt-1 shadow-xs">
                      <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        <span className="flex items-center space-x-1">
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Converted Payable Total:</span>
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          1 {currencySymbol} = {parsedFxRate}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium">In {targetCurrency}:</span>
                        <span className="font-mono text-lg font-black text-[#0073ea]">
                          {targetCurrencyInfo.symbol}
                          {convertedFinalTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-xs font-bold text-foreground">{targetCurrency}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Digital Authentication Seal & Signature */}
              <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span>
                    Official VinzMedia Digital Invoice • Verified & Signed Electronically
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span>Authorized Representative • VinzMedia Enterprise</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
