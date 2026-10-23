"use client";

import React, { useState, useEffect, useRef } from "react";
import { getInvoiceSenderSettings } from "@/lib/invoiceSenderSettings";
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
  ChevronDown,
} from "lucide-react";
import { Project, ProjectInvoiceItem, PaymentSchedule, Client, DEFAULT_BANK_DETAILS } from "@/types";
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
import { buildFixedPriceInvoiceItems } from "@/lib/paymentMilestones";

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
  const { tasks, activeWorkspace, users, clients, toast, togglePaymentPaid, updateProject, addNotification } = useStore();

  // Mode: "preview" (Executive Printable Document) vs "form" (Interactive Invoice Form Editor)
  const [activeTab, setActiveTab] = useState<"preview" | "form">("preview");
  const dialogRef = useRef<HTMLDivElement>(null);

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
  const [paymentMethod, setPaymentMethod] = useState<string>("Direct Bank Wire / Remittance");
  const [bankName, setBankName] = useState<string>(
    project?.bank_name || DEFAULT_BANK_DETAILS.bank_name
  );
  const [accountName, setAccountName] = useState<string>(
    project?.account_name || DEFAULT_BANK_DETAILS.account_name
  );
  const [bankIban, setBankIban] = useState<string>(
    project?.bank_iban || DEFAULT_BANK_DETAILS.bank_iban
  );
  const [accountNumber, setAccountNumber] = useState<string>(
    project?.account_number || DEFAULT_BANK_DETAILS.account_number
  );
  const [bankCurrency, setBankCurrency] = useState<string>(
    project?.bank_currency || DEFAULT_BANK_DETAILS.bank_currency
  );
  const [swiftBic, setSwiftBic] = useState<string>(
    project?.swift_bic || DEFAULT_BANK_DETAILS.swift_bic
  );
  const [routingNumber, setRoutingNumber] = useState<string>(
    project?.routing_number || DEFAULT_BANK_DETAILS.routing_number
  );
  const [notes, setNotes] = useState<string>("");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

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

  // Helper to construct line items tailored to the selected payment schedule
  const buildLineItemsForSchedule = (
    proj: Project,
    sched: PaymentSchedule,
    termsDays?: number
  ): ProjectInvoiceItem[] => {
    if (proj.billing_type !== "hourly") {
      return buildFixedPriceInvoiceItems(proj);
    } else {
      // Hourly Time & Materials
      const rate = Number(proj.hourly_rate) || 75;
      const baseHoursPerWk = Number(proj.estimated_hours_per_week || proj.estimated_hours || 40);

      let billableHours = baseHoursPerWk;
      let label = "Hourly services · Weekly";

      if (sched === "weekly") {
        billableHours = baseHoursPerWk;
        label = "Hourly services · Weekly";
      } else if (sched === "15_days") {
        billableHours = Math.round(((baseHoursPerWk * 15) / 7) * 10) / 10;
        label = "Hourly services · Every 15 days";
      } else if (sched === "30_days") {
        billableHours = Math.round(((baseHoursPerWk * 30) / 7) * 10) / 10;
        label = "Hourly services · Monthly";
      } else {
        const d = termsDays || 30;
        billableHours = Math.round(((baseHoursPerWk * d) / 7) * 10) / 10;
        label = `Hourly services · ${d}-day period`;
      }

      const cycleAmount = Math.round(billableHours * rate * 100) / 100;
      return [
        {
          id: `item_capacity_${sched}`,
          description: label,
          quantity: billableHours,
          rate: rate,
          amount: cycleAmount,
        },
      ];
    }
  };

  // Helper to compute projected cycle subtotal for badge previews
  const getSubtotalForSchedule = (sched: PaymentSchedule): number => {
    if (project.billing_type !== "hourly") {
      return buildFixedPriceInvoiceItems(project).reduce((sum, item) => sum + item.amount, 0);
    } else {
      const rate = Number(project?.hourly_rate) || 75;
      const baseHours = Number(project?.estimated_hours_per_week || project?.estimated_hours || 40);
      if (sched === "weekly") {
        return Math.round(baseHours * rate * 100) / 100;
      } else if (sched === "15_days") {
        const h = Math.round(((baseHours * 15) / 7) * 10) / 10;
        return Math.round(h * rate * 100) / 100;
      } else {
        const h = Math.round(((baseHours * 30) / 7) * 10) / 10;
        return Math.round(h * rate * 100) / 100;
      }
    }
  };

  // Helper to construct initial line items from project
  const buildInitialLineItems = (proj: Project): ProjectInvoiceItem[] => {
    const sched = proj.payment_schedule || "30_days";
    const days =
      proj.payment_terms_days ||
      (sched === "weekly" ? 7 : sched === "15_days" ? 15 : 30);
    return buildLineItemsForSchedule(proj, sched, days);
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
      const sender = getInvoiceSenderSettings(activeWorkspace.id, activeWorkspace.name);
      setProviderCompany(sender.company);
      setProviderAddress(sender.address);
      setProviderEmail(sender.email);
      setProviderTaxId(sender.taxId);

      // Notes
      setNotes(
        `Payment is due within ${days} days of the invoice date.`
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

      // Bank & Wire Remittance Details initialization
      setBankName(project.bank_name || DEFAULT_BANK_DETAILS.bank_name);
      setAccountName(project.account_name || DEFAULT_BANK_DETAILS.account_name);
      setBankIban(project.bank_iban || DEFAULT_BANK_DETAILS.bank_iban);
      setAccountNumber(project.account_number || DEFAULT_BANK_DETAILS.account_number);
      setBankCurrency(project.bank_currency || DEFAULT_BANK_DETAILS.bank_currency);
      setSwiftBic(project.swift_bic || DEFAULT_BANK_DETAILS.swift_bic);
      setRoutingNumber(project.routing_number || DEFAULT_BANK_DETAILS.routing_number);

      // Notify that invoice is ready to view
      addNotification({
        id: `notif_invoice_ready_${project.id}_${generatedNum}`,
        title: `Invoice Ready to View: ${project.name}`,
        message: `Invoice #${generatedNum} for ${currencySymbol}${getSubtotalForSchedule(sched).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${project.billing_type !== "hourly" ? "Milestone payment" : sched === "weekly" ? "Weekly cycle" : sched === "15_days" ? "15-Day cycle" : "30-Day cycle"}) is ready to view and export.`,
        type: "invoice",
        link_url: "/billing",
      });
    }
  }, [isOpen, project]);

  const handleSaveBankToProject = () => {
    updateProject(project.id, {
      bank_name: bankName.trim() || undefined,
      account_name: accountName.trim() || undefined,
      bank_iban: bankIban.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
      bank_currency: bankCurrency.trim() || undefined,
      swift_bic: swiftBic.trim() || undefined,
      routing_number: routingNumber.trim() || undefined,
    });
    addNotification({
      title: `Bank Details Updated: ${project.name}`,
      message: `Default remittance bank details updated (${bankName || "Wire Details"}).`,
      type: "billing",
      link_url: "/billing",
    });
    toast?.success("Bank Details Saved", `Updated default bank details for ${project.name}`);
  };

  const handleApplyBankPreset = () => {
    setBankName(DEFAULT_BANK_DETAILS.bank_name);
    setAccountName(DEFAULT_BANK_DETAILS.account_name);
    setBankIban(DEFAULT_BANK_DETAILS.bank_iban);
    setAccountNumber(DEFAULT_BANK_DETAILS.account_number);
    setBankCurrency(DEFAULT_BANK_DETAILS.bank_currency);
    setSwiftBic(DEFAULT_BANK_DETAILS.swift_bic);
    setRoutingNumber(DEFAULT_BANK_DETAILS.routing_number);
    toast?.success("Bank Preset Applied", "Loaded Emirates NBD (ENBD) details");
  };

  const handleCopyField = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldName);
    setTimeout(() => setCopiedBankField(null), 2000);
    toast?.success("Copied", `${fieldName} copied to clipboard`);
  };

  // Handle schedule change - dynamically recalculates subtotal and line items
  const handleScheduleChange = (newSched: PaymentSchedule) => {
    if (project.billing_type !== "hourly") return;
    setPaymentSchedule(newSched);
    let days = 30;
    if (newSched === "weekly") days = 7;
    else if (newSched === "15_days") days = 15;
    else if (newSched === "30_days") days = 30;
    else days = paymentTermsDays;

    setPaymentTermsDays(days);
    const newDue = computeDueDate(issueDate, days);
    setDueDate(newDue);

    // Dynamically recalculate line items and subtotal for the selected cycle
    const updatedItems = buildLineItemsForSchedule(project, newSched, days);
    setLineItems(updatedItems);

    const newSubtotal = updatedItems.reduce((acc, it) => acc + (it.amount || 0), 0);
    const schedLabel =
      newSched === "weekly"
        ? "Weekly Payment (Net 7)"
        : newSched === "15_days"
        ? "Every 15 Days (Net 15)"
        : "30 Days (Net 30)";

    setNotes(
      `Payment is due within ${days} days of the invoice date.`
    );

    toast?.success(
      "Payment Subtotal Updated",
      `${schedLabel}: Subtotal is ${currencySymbol}${newSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    );
  };

  // Switch to billing full project contract at once
  const handleBillFullContract = () => {
    if (project.billing_type !== "hourly") {
      const fixedTotal = Number(project.fixed_price_amount) || 0;
      setLineItems([
        {
          id: "item_full_contract",
          description: `Full Contract Milestone Delivery (${project.name})`,
          quantity: 1,
          rate: fixedTotal,
          amount: fixedTotal,
        },
      ]);
      toast?.success("Full Contract Billed", `Subtotal set to ${currencySymbol}${fixedTotal.toLocaleString()}`);
    } else {
      const rate = Number(project.hourly_rate) || 75;
      const hrs = Number(project.estimated_hours || project.estimated_hours_per_week || 40);
      setLineItems([
        {
          id: "item_full_hourly",
          description: `Full Estimated Project Hours (${hrs} hrs @ ${currencySymbol}${rate}/hr)`,
          quantity: hrs,
          rate: rate,
          amount: hrs * rate,
        },
      ]);
      toast?.success("Total Labor Billed", `Subtotal set to ${currencySymbol}${(hrs * rate).toLocaleString()}`);
    }
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
      addNotification({
        title: `Payment Received: ${project.name}`,
        message: `Invoice #${invoiceNumber} for ${currencySymbol}${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} has been settled and marked Paid.`,
        type: "billing",
        link_url: "/billing",
      });
      toast?.success("Marked Paid", `Project ${project.name} payment registered.`);
    } else if (invoiceStatus === "Paid") {
      togglePaymentPaid(project.id, false);
    }
  };

  // Save invoice settings to project
  const handleSaveToProject = () => {
    try {
      updateProject(project.id, {
        ...(project.billing_type === "hourly" ? { payment_schedule: paymentSchedule } : {}),
        payment_terms_days: paymentTermsDays,
        enable_currency_conversion: enableConversion,
        converted_currency: targetCurrency,
        conversion_rate: parsedFxRate,
        client_id: selectedClientId || undefined,
      });

      const schedName =
        project.billing_type !== "hourly" ? "Milestone payment" : paymentSchedule === "weekly"
          ? "Weekly (Net 7)"
          : paymentSchedule === "15_days"
          ? "Every 15 Days (Net 15)"
          : "30 Days (Net 30)";

      addNotification({
        title: `Invoice Ready to View: ${project.name}`,
        message: `Invoice #${invoiceNumber} (${schedName}) for ${currencySymbol}${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} has been saved and is ready to view.`,
        type: "invoice",
        link_url: "/billing",
      });

      toast?.success("Invoice Settings Saved", "Invoice payment terms and settings updated.");
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
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, select, input, textarea, summary, [tabindex="0"]')).filter((element) => element.getClientRects().length > 0 && !element.hasAttribute("disabled"));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="invoice-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto cursor-pointer"
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
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-dialog-title"
          className="invoice-dialog bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[960px] max-h-[92dvh] overflow-hidden flex flex-col my-auto cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="no-print shrink-0 border-b border-border bg-card px-5 py-4 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="invoice-dialog-title" className="text-lg font-semibold tracking-tight">Invoice</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">{project.name} <span className="mx-1.5 text-border">/</span> {invoiceNumber}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close invoice" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg bg-secondary/70 p-1" role="tablist" aria-label="Invoice view" onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? "preview" : event.key === "End" ? "form" : activeTab === "preview" ? "form" : "preview";
                setActiveTab(next);
                document.getElementById(next === "preview" ? "invoice-preview-tab" : "invoice-editor-tab")?.focus();
              }}>
                <button id="invoice-preview-tab" tabIndex={activeTab === "preview" ? 0 : -1} role="tab" aria-selected={activeTab === "preview"} aria-controls="invoice-preview-panel" onClick={() => setActiveTab("preview")} className={`rounded-md px-4 py-2 text-xs font-medium transition-colors ${activeTab === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Preview</button>
                <button id="invoice-editor-tab" tabIndex={activeTab === "form" ? 0 : -1} role="tab" aria-selected={activeTab === "form"} aria-controls="invoice-editor-panel" onClick={() => setActiveTab("form")} className={`rounded-md px-4 py-2 text-xs font-medium transition-colors ${activeTab === "form" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Edit details</button>
              </div>
              <div className="flex items-center gap-2">
                <select aria-label="Invoice status" value={invoiceStatus} onChange={(event) => handleStatusChange(event.target.value as "Draft" | "Issued" | "Paid" | "Overdue")} className="h-9 rounded-lg border border-border bg-card px-3 text-xs">
                  <option value="Draft">Draft</option><option value="Issued">Issued</option><option value="Paid">Mark as paid</option><option value="Overdue">Overdue</option>
                </select>
                <button type="button" onClick={handlePrint} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"><Printer className="h-3.5 w-3.5" />Print / PDF</button>
              </div>
            </div>
          </header>

          <details className="invoice-options no-print shrink-0 border-b border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 sm:px-7">
              <span className="text-xs font-medium">Billing options <span className="ml-2 hidden font-normal text-muted-foreground sm:inline">{project.billing_type === "hourly" ? `Hourly · Net ${paymentTermsDays}` : "Fixed price · Milestone schedule"}{enableConversion ? ` · Convert to ${targetCurrency}` : ""}</span></span>
              <ChevronDown className="invoice-disclosure h-4 w-4 text-muted-foreground transition-transform" />
            </summary>
            <div className="grid gap-5 border-t border-border/60 px-5 py-5 sm:grid-cols-2 sm:px-7">
              <div className="space-y-2">
                {project.billing_type === "hourly" ? <>
                  <label htmlFor="invoice-cycle" className="text-xs font-medium">Billing cycle</label>
                  <select id="invoice-cycle" value={paymentSchedule} onChange={(event) => handleScheduleChange(event.target.value as PaymentSchedule)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs">
                    <option value="weekly">Weekly · Net 7</option><option value="15_days">Every 15 days · Net 15</option><option value="30_days">Monthly · Net 30</option><option value="custom">Custom terms</option>
                  </select>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">Applies to hourly work. Changing the cycle updates the invoice items.</p>
                </> : <>
                  <p className="text-xs font-medium">Milestone billing</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">This invoice uses your configured project milestone. Billing cycles apply to hourly work only.</p>
                </>}
                <button type="button" onClick={handleBillFullContract} className="text-xs font-medium text-primary hover:underline">{project.billing_type === "hourly" ? "Use full estimated hours instead" : "Bill the full contract instead"}</button>
              </div>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium"><input type="checkbox" checked={enableConversion} onChange={(event) => setEnableConversion(event.target.checked)} className="h-4 w-4 rounded" />Currency conversion</label>
                <p className="text-[11px] leading-relaxed text-muted-foreground">Show an additional payable amount in another currency.</p>
                {enableConversion && <div className="flex items-center gap-3">
                  <select aria-label="Conversion currency" value={targetCurrency} onChange={(event) => handleTargetCurrencyChange(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-xs">{SUPPORTED_CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} · {currency.name}</option>)}</select>
                  <button type="button" onClick={handleResetRate} disabled={isLoadingRate} aria-label="Refresh exchange rate" className="rounded-lg border border-border p-2.5 text-muted-foreground hover:bg-secondary"><RefreshCw className={`h-4 w-4 ${isLoadingRate ? "animate-spin" : ""}`} /></button>
                </div>}
              </div>
            </div>
          </details>

          {/* MAIN CONTENT AREA: TAB 1 (FORM EDITOR) OR TAB 2 (PREVIEW) */}
          {activeTab === "form" ? (
            /* ================= INVOICE FORM EDITOR MODE ================= */
            <div key="invoice-form" id="invoice-editor-panel" role="tabpanel" aria-labelledby="invoice-editor-tab" className="invoice-editor min-h-0 p-4 sm:p-7 space-y-4 overflow-y-auto flex-1 bg-background">
              <details className="invoice-editor-section" open>
                <summary><span className="invoice-step">1</span><span className="flex-1"><span className="block text-sm font-medium">Invoice details</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Number, dates, and payment terms</span></span><ChevronDown className="invoice-disclosure h-4 w-4 shrink-0 text-muted-foreground" /></summary>
              {/* Section 1: Invoice Identification & Schedule */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">


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

                  {project.billing_type === "hourly" ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Payment Schedule</label>
                    <select
                      value={paymentSchedule}
                      onChange={(e) => handleScheduleChange(e.target.value as PaymentSchedule)}
                      className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground cursor-pointer font-medium"
                    >
                      <option value="weekly">
                        Weekly Payment (Net 7) — {currencySymbol}{getSubtotalForSchedule("weekly").toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </option>
                      <option value="15_days">
                        Every 15 Days (Net 15) — {currencySymbol}{getSubtotalForSchedule("15_days").toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </option>
                      <option value="30_days">
                        30 Days Payment (Net 30) — {currencySymbol}{getSubtotalForSchedule("30_days").toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </option>
                      <option value="custom">Custom Terms</option>
                    </select>
                  </div>
                  ) : (
                    <div className="space-y-1">
                      <label htmlFor="fixed-invoice-terms" className="text-[11px] font-semibold text-foreground">Payment Terms (days)</label>
                      <input id="fixed-invoice-terms" type="number" min="0" step="1" value={paymentTermsDays} onChange={(event) => {
                        const days = Math.max(0, Math.trunc(Number(event.target.value) || 0));
                        setPaymentTermsDays(days);
                        setDueDate(computeDueDate(issueDate, days));
                      }} className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs" />
                    </div>
                  )}

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

              </details>

              <details className="invoice-editor-section">
                <summary><span className="invoice-step">2</span><span className="flex-1"><span className="block text-sm font-medium">Client & sender</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Who the invoice is from and who pays it</span></span><ChevronDown className="invoice-disclosure h-4 w-4 shrink-0 text-muted-foreground" /></summary>
              {/* Section 2: Parties Information (Client & Provider) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Billed To (Client) */}
                <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-foreground">Client details</h3>
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
                      <h3 className="text-xs font-bold text-foreground">Sender details</h3>
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

              </details>

              <details className="invoice-editor-section" open>
                <summary><span className="invoice-step">3</span><span className="flex-1"><span className="block text-sm font-medium">Line items & totals</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Services, quantities, tax, and discount</span></span><ChevronDown className="invoice-disclosure h-4 w-4 shrink-0 text-muted-foreground" /></summary>
              {/* Section 3: Itemized Line Items Table Editor */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">


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
                          aria-label={`Item ${index + 1} description`}
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
                          aria-label={`Item ${index + 1} quantity`}
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
                          aria-label={`Item ${index + 1} rate`}
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

              </details>

              <details className="invoice-editor-section">
                <summary><span className="invoice-step">4</span><span className="flex-1"><span className="block text-sm font-medium">Bank details</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Where the payment should be sent</span></span><ChevronDown className="invoice-disclosure h-4 w-4 shrink-0 text-muted-foreground" /></summary>
              {/* Section 4: Bank Remittance Details */}
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={handleApplyBankPreset}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                      title="Fill Emirates NBD (ENBD) default details"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Use bank preset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBankToProject}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
                      title="Save these bank details as default for this project"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Save bank defaults</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Account Holder Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Nevin Pandacan Alcober"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Beneficiary Bank *</label>
                    <input
                      type="text"
                      placeholder="e.g. Emirates NBD (ENBD)"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">IBAN *</label>
                    <input
                      type="text"
                      placeholder="e.g. AE790260001015470817401"
                      value={bankIban}
                      onChange={(e) => setBankIban(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Account Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 1015470817401"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Currency</label>
                    <input
                      type="text"
                      placeholder="AED"
                      value={bankCurrency}
                      onChange={(e) => setBankCurrency(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">SWIFT / BIC Code</label>
                    <input
                      type="text"
                      placeholder="EBILAEAD"
                      value={swiftBic}
                      onChange={(e) => setSwiftBic(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Routing Number</label>
                    <input
                      type="text"
                      placeholder="302620122"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono"
                    />
                  </div>
                </div>
              </div>

              </details>

              {/* Form Actions Footer */}
              <div className="invoice-editor-footer flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card p-4 rounded-xl">
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
                  <span>Save & preview</span>
                </button>
              </div>
            </div>
          ) : (
            <div key="invoice-preview" id="invoice-preview-panel" role="tabpanel" aria-labelledby="invoice-preview-tab" className="invoice-preview-scroll min-h-0 flex-1 overflow-y-auto bg-background p-3 sm:p-7">
              <article id="invoice-printable-area" className="invoice-document mx-auto max-w-[820px] rounded-xl border border-border bg-card p-6 shadow-soft sm:p-10">
                <div className="invoice-brand mb-9">
                  <span className="invoice-brand-mark" aria-hidden="true">V</span>
                  <div><p className="text-lg font-bold tracking-tight">VINZMEDIA</p><p className="text-xs">Design &amp; Development</p></div>
                </div>
                <p className="invoice-eyebrow mb-2">Invoice / {project.billing_type === "fixed" ? "Project milestone" : "Professional services"}</p>
                <h2 className="invoice-project-title mb-8">{project.name}</h2>
                <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-7">
                  <div className="min-w-0 space-y-2">
                    <p className="invoice-label">From</p>
                    <h1 className="max-w-sm text-lg font-semibold leading-snug tracking-tight">{providerCompany}</h1>
                    {providerAddress && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{providerAddress}</p>}
                    {providerEmail && <p className="text-xs text-muted-foreground break-all">{providerEmail}</p>}
                    {providerTaxId && <p className="text-[11px] text-muted-foreground">Tax ID · {providerTaxId}</p>}
                  </div>
                  <div className="invoice-amount-card space-y-2 sm:text-right">
                    <p className="invoice-label">Invoice · Total due</p>
                    <p className="text-2xl font-semibold tracking-tight tabular-nums">{currencySymbol}{finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <div className="flex items-center gap-2 sm:justify-end"><span className="text-xs text-muted-foreground">{invoiceNumber}</span><button type="button" onClick={handleCopyInvoiceNumber} aria-label="Copy invoice number" className="no-print rounded p-1 text-muted-foreground hover:bg-secondary">{copiedInvoiceNumber ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</button></div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${invoiceStatus === "Paid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : invoiceStatus === "Overdue" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-secondary text-muted-foreground"}`}>{invoiceStatus}</span>
                  </div>
                </div>

                <div className="grid gap-7 border-b border-border py-7 sm:grid-cols-2">
                  <div className="space-y-2"><p className="invoice-label">Bill to</p><p className="text-sm font-semibold">{clientCompany || project.name}</p>{clientName && <p className="text-xs text-muted-foreground">{clientName}</p>}{clientEmail && <p className="break-all text-xs text-muted-foreground">{clientEmail}</p>}{clientAddress && <p className="text-xs leading-relaxed text-muted-foreground">{clientAddress}</p>}{clientTaxId && <p className="text-[11px] text-muted-foreground">Tax ID · {clientTaxId}</p>}</div>
                  <dl className="space-y-3 text-xs">
                    <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Project</dt><dd className="text-right font-medium">{project.name}</dd></div>
                    <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Issued</dt><dd>{formatDate(issueDate)}</dd></div>
                    <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Due date</dt><dd className="font-medium">{formatDate(dueDate)}</dd></div>
                    <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Terms</dt><dd className="text-right">{project.billing_type === "hourly" ? `${paymentSchedule === "weekly" ? "Weekly" : paymentSchedule === "15_days" ? "Every 15 days" : paymentSchedule === "30_days" ? "Monthly" : "Custom"} · Net ${paymentTermsDays}` : `Milestone · Net ${paymentTermsDays}`}</dd></div>
                  </dl>
                </div>

                <div className="invoice-line-items overflow-x-auto py-7">
                  <table className="w-full min-w-[460px] text-left text-xs">
                    <thead><tr className="border-b border-border"><th className="pb-3 pr-4">Description</th><th className="pb-3 px-3 text-right">Qty</th><th className="pb-3 px-3 text-right">Rate</th><th className="pb-3 pl-3 text-right">Amount</th></tr></thead>
                    <tbody className="divide-y divide-border/60">{lineItems.map((item, index) => <tr key={item.id || index}><td className="py-5 pr-4 leading-relaxed">{item.description}</td><td className="px-3 py-5 text-right tabular-nums text-muted-foreground">{item.quantity}</td><td className="px-3 py-5 text-right tabular-nums whitespace-nowrap">{currencySymbol}{Number(item.rate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td><td className="pl-3 py-5 text-right font-medium tabular-nums whitespace-nowrap">{currencySymbol}{Number(item.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>)}</tbody>
                  </table>
                </div>

                <div className="flex justify-end border-t border-border pt-5">
                  <dl className="w-full space-y-3 text-xs sm:max-w-xs">
                    <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{currencySymbol}{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div>
                    {taxRate > 0 && <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Tax ({taxRate}%)</dt><dd className="tabular-nums">{currencySymbol}{calculatedTax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div>}
                    {discountAmount > 0 && <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Discount</dt><dd className="tabular-nums">−{currencySymbol}{discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div>}
                    <div className="flex items-center justify-between gap-5 border-t border-border pt-4"><dt className="font-medium">Total due <span className="block mt-1 text-[10px] font-normal text-muted-foreground">{project.currency || "USD"}</span></dt><dd className="text-2xl font-semibold tracking-tight tabular-nums">{currencySymbol}{finalTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div>
                    {enableConversion && <div className="rounded-lg bg-secondary/60 p-3"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Payable in {targetCurrency}</dt><dd className="font-medium tabular-nums">{targetCurrencyInfo.symbol}{convertedFinalTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div><p className="mt-2 text-[10px] text-muted-foreground">1 {currencySymbol} = {parsedFxRate} {targetCurrency}</p></div>}
                  </dl>
                </div>

                <section className="mt-9 border-t border-border pt-6">
                  <h3 className="invoice-label mb-4">Payment details</h3>
                  <dl className="grid gap-x-8 gap-y-4 text-xs sm:grid-cols-2">
                    {[["Account holder", accountName], ["Bank", bankName], ["IBAN", bankIban], ["Account number", accountNumber], ["Bank currency", bankCurrency], ["SWIFT / BIC", swiftBic], ["Routing number", routingNumber]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1.5 text-[11px] text-muted-foreground">{label}</dt><dd className="break-all font-medium">{value}{(label === "IBAN" || label === "Account number") && <button type="button" aria-label={`Copy ${label}`} onClick={() => handleCopyField(value, label)} className="no-print ml-2 rounded p-1 text-muted-foreground hover:bg-secondary">{copiedBankField === label ? <Check className="inline h-3 w-3" /> : <Copy className="inline h-3 w-3" />}</button>}</dd></div>)}
                  </dl>
                  <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">Use {invoiceNumber} as your payment reference.</p>
                </section>
                {notes && <section className="mt-6 border-t border-border pt-5"><h3 className="invoice-label mb-2">Notes</h3><p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{notes}</p></section>}
                <footer className="mt-8 border-t border-border pt-4 text-[10px] text-muted-foreground">{providerCompany} · {providerEmail}</footer>
              </article>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
