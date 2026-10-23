"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  DollarSign,
  Clock,
  Coins,
  Check,
  Receipt,
  Calendar,
  AlertCircle,
  HelpCircle,
  Percent,
  Sliders,
  Plus,
  Trash2,
  Sparkles,
  ArrowRightLeft,
  Globe,
  Building2,
  UserPlus,
  RefreshCw,
  CalendarDays,
  Landmark,
} from "lucide-react";
import { Project, ProjectBillingType, ProjectPaymentInstallment, PaymentSchedule, DEFAULT_BANK_DETAILS } from "@/types";
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
import { reconcilePaymentMilestones } from "@/lib/paymentMilestones";

interface EditProjectBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function EditProjectBillingModal({
  isOpen,
  onClose,
  project,
}: EditProjectBillingModalProps) {
  const { updateProject, clients, createClient, addNotification } = useStore();
  const toast = useToast();

  // Client association & inline creator
  const [selectedClientId, setSelectedClientId] = useState<string>(
    project?.client_id || ""
  );
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  const [billingType, setBillingType] = useState<ProjectBillingType>(
    project?.billing_type || "fixed"
  );
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule>(
    project?.payment_schedule || "30_days"
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(
    project?.payment_terms_days ||
      (project?.payment_schedule === "weekly"
        ? 7
        : project?.payment_schedule === "15_days"
        ? 15
        : 30)
  );
  const [fixedAmount, setFixedAmount] = useState<string>(
    String(project?.fixed_price_amount || "5000")
  );
  const [milestones, setMilestones] = useState<ProjectPaymentInstallment[]>([]);
  const installmentsCount = milestones.length;

  const [hourlyRate, setHourlyRate] = useState<string>(
    String(project?.hourly_rate || "75")
  );
  const [hoursPerWeek, setHoursPerWeek] = useState<string>(
    String(project?.estimated_hours_per_week || project?.estimated_hours || "40")
  );
  const [currency, setCurrency] = useState<string>(project?.currency || "$");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partially_paid" | "paid">(
    project?.payment_status || "unpaid"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Currency Conversion state & Real-time Live Market Rates
  const [enableConversion, setEnableConversion] = useState<boolean>(
    project?.enable_currency_conversion || false
  );
  const [targetCurrency, setTargetCurrency] = useState<string>(
    project?.converted_currency || "PHP"
  );
  const [conversionRate, setConversionRate] = useState<string>(
    project?.conversion_rate
      ? String(project.conversion_rate)
      : String(getDefaultExchangeRate(project?.currency || "$", "PHP"))
  );
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);
  const [isLiveRate, setIsLiveRate] = useState<boolean>(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string>("");

  // Bank Transfer & Remittance Details
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

  const parsedFixed = parseFloat(fixedAmount) || 0;
  const parsedRate = parseFloat(hourlyRate) || 0;
  const parsedHoursPerWeek = parseFloat(hoursPerWeek) || 0;
  const weeklyAmount = parsedRate * parsedHoursPerWeek;

  // Initialize or generate milestones
  const buildDefaultMilestones = (count: number, total: number, preset?: "equal" | "50-50" | "40-40-20") => {
    const items: ProjectPaymentInstallment[] = [];
    const equalPct = Math.round((100 / count) * 10) / 10;

    for (let i = 1; i <= count; i++) {
      let pct = equalPct;
      if (preset === "50-50" && count === 2) {
        pct = 50;
      } else if (preset === "40-40-20" && count === 3) {
        pct = i === 1 ? 40 : i === 2 ? 40 : 20;
      } else if (i === count) {
        const sumSoFar = items.reduce((acc, it) => acc + (it.percentage || 0), 0);
        pct = Math.max(0, Math.round((100 - sumSoFar) * 10) / 10);
      }

      const amt = Math.round(((total * pct) / 100) * 100) / 100;
      items.push({
        id: `inst_${project?.id || "proj"}_${i}`,
        project_id: project?.id || "",
        installment_number: i,
        title:
          i === 1
            ? "Deposit / Upfront Kickoff"
            : i === count
            ? "Final Delivery & Handover"
            : `Milestone #${i} Delivery`,
        percentage: pct,
        amount: amt,
        status: "pending",
      });
    }
    return items;
  };

  useEffect(() => {
    if (isOpen) {
      setBillingType(project.billing_type || "fixed");
      const sched = project.payment_schedule || "30_days";
      setPaymentSchedule(sched);
      setPaymentTermsDays(
        project.payment_terms_days ||
          (sched === "weekly" ? 7 : sched === "15_days" ? 15 : 30)
      );
      const currentFixed = project.fixed_price_amount || 5000;
      setFixedAmount(String(currentFixed));
      const currentCount = project.payment_installments_count || 3;
      setHourlyRate(String(project.hourly_rate || "75"));
      setHoursPerWeek(
        String(project.estimated_hours_per_week || project.estimated_hours || "40")
      );
      setCurrency(project.currency || "$");
      setPaymentStatus(project.payment_status || "unpaid");
      setSelectedClientId(project.client_id || "");
      setIsCreatingClient(false);

      // Currency conversion initialization
      setEnableConversion(project.enable_currency_conversion || false);
      const targetCurr = project.converted_currency || "PHP";
      setTargetCurrency(targetCurr);
      setConversionRate(
        project.conversion_rate
          ? String(project.conversion_rate)
          : String(getDefaultExchangeRate(project.currency || "$", targetCurr))
      );

      if (project.enable_currency_conversion) {
        updateRateInRealtime(project.currency || "$", targetCurr);
      }

      // Bank Transfer & Remittance Details initialization
      setBankName(project.bank_name || DEFAULT_BANK_DETAILS.bank_name);
      setAccountName(project.account_name || DEFAULT_BANK_DETAILS.account_name);
      setBankIban(project.bank_iban || DEFAULT_BANK_DETAILS.bank_iban);
      setAccountNumber(project.account_number || DEFAULT_BANK_DETAILS.account_number);
      setBankCurrency(project.bank_currency || DEFAULT_BANK_DETAILS.bank_currency);
      setSwiftBic(project.swift_bic || DEFAULT_BANK_DETAILS.swift_bic);
      setRoutingNumber(project.routing_number || DEFAULT_BANK_DETAILS.routing_number);

      // Load existing installments or generate default
      const existing = project.installments || [];
      setMilestones(reconcilePaymentMilestones(
        existing,
        buildDefaultMilestones(currentCount, currentFixed),
        currentFixed,
      ));
    }
  }, [isOpen, project]);

  // Handle count change
  const handleCountChange = (newCount: number) => {
    setMilestones(buildDefaultMilestones(newCount, parsedFixed));
  };

  // Update a milestone percentage and recompute amount
  const handlePercentageChange = (idx: number, newPctStr: string) => {
    const newPct = Math.max(0, parseFloat(newPctStr) || 0);
    setMilestones((prev) =>
      prev.map((m, i) => {
        if (i === idx) {
          const amt = Math.round(((parsedFixed * newPct) / 100) * 100) / 100;
          return { ...m, percentage: newPct, amount: amt };
        }
        return m;
      })
    );
  };

  // Update a milestone title
  const handleTitleChange = (idx: number, newTitle: string) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, title: newTitle } : m))
    );
  };

  // Toggle milestone paid status
  const handleToggleMilestonePaid = (idx: number) => {
    setMilestones((prev) =>
      prev.map((m, i) => {
        if (i === idx) {
          const willBePaid = m.status !== "paid";
          return {
            ...m,
            status: willBePaid ? "paid" : "pending",
            paid_at: willBePaid ? new Date().toISOString() : undefined,
          };
        }
        return m;
      })
    );
  };

  // Auto-balance sum of percentages to 100%
  const handleAutoBalance = () => {
    if (milestones.length === 0) return;
    const count = milestones.length;
    const equalPct = Math.round((100 / count) * 10) / 10;
    setMilestones((prev) => {
      const items: ProjectPaymentInstallment[] = [];
      for (let i = 0; i < count; i++) {
        let pct = equalPct;
        if (i === count - 1) {
          const sumSoFar = items.reduce((acc, it) => acc + (it.percentage || 0), 0);
          pct = Math.max(0, Math.round((100 - sumSoFar) * 10) / 10);
        }
        const amt = Math.round(((parsedFixed * pct) / 100) * 100) / 100;
        items.push({
          ...prev[i],
          percentage: pct,
          amount: amt,
        });
      }
      return items;
    });
    toast?.success("Auto-Balanced", "Percentages distributed evenly to 100%");
  };

  // Recalculate amounts whenever total fixedAmount changes
  useEffect(() => {
    if (parsedFixed > 0 && milestones.length > 0) {
      setMilestones((prev) =>
        prev.map((m) => ({
          ...m,
          amount: Math.round(((parsedFixed * (m.percentage || 0)) / 100) * 100) / 100,
        }))
      );
    }
  }, [fixedAmount]);

  const handleScheduleSelect = (sched: PaymentSchedule) => {
    setPaymentSchedule(sched);
    const days = sched === "weekly" ? 7 : sched === "15_days" ? 15 : 30;
    setPaymentTermsDays(days);

    if (billingType === "fixed" && parsedFixed > 0) {
      let newCount = 1;
      let titles: string[] = [];
      if (sched === "weekly") {
        newCount = weeksToDeadline ? Math.max(2, Math.min(12, Math.round(weeksToDeadline))) : 4;
        titles = Array.from({ length: newCount }).map((_, i) =>
          i === newCount - 1 ? `Week ${i + 1} Final Payment & Handover` : `Week ${i + 1} Progress Payment`
        );
      } else if (sched === "15_days") {
        newCount = 2;
        titles = ["1st Half Installment (Day 1-15)", "2nd Half Final Installment (Day 16-30)"];
      } else {
        newCount = 1;
        titles = ["Full Contract Delivery Settlement"];
      }

      const equalPct = Math.round((100 / newCount) * 10) / 10;
      const newMilestones: ProjectPaymentInstallment[] = [];
      for (let i = 1; i <= newCount; i++) {
        let pct = equalPct;
        if (i === newCount) {
          const sumSoFar = newMilestones.reduce((acc, m) => acc + (m.percentage || 0), 0);
          pct = Math.max(0, Math.round((100 - sumSoFar) * 10) / 10);
        }
        const amt = Math.round(((parsedFixed * pct) / 100) * 100) / 100;
        newMilestones.push({
          id: `inst_${sched}_${i}`,
          project_id: project?.id || "",
          installment_number: i,
          title: titles[i - 1] || `Payment #${i}`,
          percentage: pct,
          amount: amt,
          status: "pending",
        });
      }
      setMilestones(newMilestones);
      toast?.success(
        "Payment Schedule & Subtotal Updated",
        `Split into ${newCount} ${sched === "weekly" ? "weekly" : sched === "15_days" ? "15-day" : "monthly"} installments of ${currency}${(Math.round((parsedFixed / newCount) * 100) / 100).toLocaleString()}`
      );
    } else if (billingType === "hourly" && parsedRate > 0 && parsedHoursPerWeek > 0) {
      let cycleAmt = weeklyAmount;
      let label = "Weekly";
      if (sched === "15_days") {
        const hrs = Math.round(((parsedHoursPerWeek * 15) / 7) * 10) / 10;
        cycleAmt = Math.round(hrs * parsedRate * 100) / 100;
        label = "Every 15 Days";
      } else if (sched === "30_days") {
        const hrs = Math.round(((parsedHoursPerWeek * 30) / 7) * 10) / 10;
        cycleAmt = Math.round(hrs * parsedRate * 100) / 100;
        label = "30 Days (Monthly)";
      }
      toast?.success(
        "Payment Schedule Updated",
        `${label} subtotal: ${currency}${cycleAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      );
    }
  };

  const updateRateInRealtime = async (baseCurr: string, targetCurr: string) => {
    setIsLoadingRate(true);
    try {
      const res = await fetchRealtimeExchangeRate(baseCurr, targetCurr);
      setConversionRate(String(res.rate));
      setIsLiveRate(res.isLive);
      setRateUpdatedAt(res.lastUpdated || "Live");
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleTargetCurrencyChange = (newTarget: string) => {
    setTargetCurrency(newTarget);
    updateRateInRealtime(currency, newTarget);
  };

  const handleResetDefaultRate = () => {
    updateRateInRealtime(currency, targetCurrency);
  };

  const handleBaseCurrencyChange = (newBase: string) => {
    setCurrency(newBase);
    if (enableConversion) {
      updateRateInRealtime(newBase, targetCurrency);
    }
  };

  const handleQuickCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientCompany.trim() && !newClientName.trim()) return;
    const created = createClient({
      name: newClientName.trim() || newClientCompany.trim(),
      company: newClientCompany.trim() || newClientName.trim(),
      email: newClientEmail.trim(),
      status: "active",
      project_ids: [project.id],
    });
    if (created) {
      setSelectedClientId(created.id);
      setIsCreatingClient(false);
      setNewClientName("");
      setNewClientCompany("");
      setNewClientEmail("");
      toast?.success("Client Created", `Linked ${created.company || created.name} to this project`);
    }
  };

  const handleApplyBankPreset = () => {
    setBankName(DEFAULT_BANK_DETAILS.bank_name);
    setAccountName(DEFAULT_BANK_DETAILS.account_name);
    setBankIban(DEFAULT_BANK_DETAILS.bank_iban);
    setAccountNumber(DEFAULT_BANK_DETAILS.account_number);
    setBankCurrency(DEFAULT_BANK_DETAILS.bank_currency);
    setSwiftBic(DEFAULT_BANK_DETAILS.swift_bic);
    setRoutingNumber(DEFAULT_BANK_DETAILS.routing_number);
    toast?.success("Bank Details Applied", "Loaded Emirates NBD (ENBD) details");
  };

  const handleClearBankDetails = () => {
    setBankName("");
    setAccountName("");
    setBankIban("");
    setAccountNumber("");
    setBankCurrency("");
    setSwiftBic("");
    setRoutingNumber("");
  };

  const totalPercentage = Math.round(
    milestones.reduce((acc, m) => acc + (m.percentage || 0), 0) * 10
  ) / 10;
  const is100Percent = totalPercentage === 100;

  // Hourly cycle calculation dynamically linked to payment schedule
  let hourlyCycleHours = parsedHoursPerWeek;
  let hourlyCycleAmount = weeklyAmount;
  let hourlyCycleLabel = "Total Amount Per Week:";
  let hourlyCycleUnit = "/ week";

  if (paymentSchedule === "15_days") {
    hourlyCycleHours = Math.round(((parsedHoursPerWeek * 15) / 7) * 10) / 10;
    hourlyCycleAmount = Math.round(hourlyCycleHours * parsedRate * 100) / 100;
    hourlyCycleLabel = "Total Amount Every 15 Days:";
    hourlyCycleUnit = "/ 15-days";
  } else if (paymentSchedule === "30_days") {
    hourlyCycleHours = Math.round(((parsedHoursPerWeek * 30) / 7) * 10) / 10;
    hourlyCycleAmount = Math.round(hourlyCycleHours * parsedRate * 100) / 100;
    hourlyCycleLabel = "Total Amount (30 Days Monthly):";
    hourlyCycleUnit = "/ month";
  }

  let weeksToDeadline: number | null = null;
  let deadlineProjectedAmount: number | null = null;

  if (project?.target_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(project.target_date);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    if (diffDays > 0) {
      weeksToDeadline = Math.max(1, Math.round((diffDays / 7) * 10) / 10);
      deadlineProjectedAmount = weeklyAmount * weeksToDeadline;
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updates: Partial<Project> = {
        billing_type: billingType,
        payment_schedule: paymentSchedule,
        payment_terms_days:
          paymentSchedule === "weekly"
            ? 7
            : paymentSchedule === "15_days"
            ? 15
            : paymentSchedule === "30_days"
            ? 30
            : paymentTermsDays,
        currency,
      };

      if (billingType === "fixed") {
        updates.fixed_price_amount = parsedFixed;
        updates.payment_installments_count = milestones.length;
        updates.installments = milestones;

        const paidMilestones = milestones.filter((m) => m.status === "paid");
        const paidTotal = paidMilestones.reduce((acc, m) => acc + m.amount, 0);
        updates.paid_amount = paidTotal;
        updates.payment_status =
          paidMilestones.length === milestones.length && milestones.length > 0
            ? "paid"
            : paidMilestones.length > 0
            ? "partially_paid"
            : paymentStatus;
        updates.last_payment_date =
          paidMilestones.length > 0 ? new Date().toISOString() : project.last_payment_date;
      } else {
        updates.hourly_rate = parsedRate;
        updates.estimated_hours_per_week = parsedHoursPerWeek;
        updates.estimated_hours = parsedHoursPerWeek;
        updates.payment_status = paymentStatus;
        updates.last_payment_date =
          paymentStatus === "paid" ? new Date().toISOString() : project.last_payment_date;
      }

      // Client association update
      updates.client_id = selectedClientId || undefined;

      // Currency conversion updates
      updates.enable_currency_conversion = enableConversion;
      updates.converted_currency = targetCurrency;
      updates.conversion_rate = parseFloat(conversionRate) || 1.0;

      // Bank Transfer & Remittance Details updates
      updates.bank_name = bankName.trim() || undefined;
      updates.account_name = accountName.trim() || undefined;
      updates.bank_iban = bankIban.trim() || undefined;
      updates.account_number = accountNumber.trim() || undefined;
      updates.bank_currency = bankCurrency.trim() || undefined;
      updates.swift_bic = swiftBic.trim() || undefined;
      updates.routing_number = routingNumber.trim() || undefined;

      updateProject(project.id, updates);

      // Compute cycle subtotal for Notification Center details
      const schedLabel =
        paymentSchedule === "weekly"
          ? "Weekly (Net 7)"
          : paymentSchedule === "15_days"
          ? "Every 15 Days (Net 15)"
          : paymentSchedule === "30_days"
          ? "30 Days (Net 30)"
          : `Custom (Net ${paymentTermsDays} Days)`;

      let cycleSubtotalText = "";
      if (billingType === "fixed") {
        const cycleAmt =
          paymentSchedule === "weekly"
            ? Math.round((parsedFixed / (weeksToDeadline ? Math.max(2, Math.min(12, Math.round(weeksToDeadline))) : 4)) * 100) / 100
            : paymentSchedule === "15_days"
            ? Math.round((parsedFixed / 2) * 100) / 100
            : parsedFixed;
        cycleSubtotalText = `${currency}${cycleAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} / cycle (${milestones.length} installments, Total: ${currency}${parsedFixed.toLocaleString()})`;
      } else {
        const cycleAmt =
          paymentSchedule === "weekly"
            ? weeklyAmount
            : paymentSchedule === "15_days"
            ? Math.round(((weeklyAmount * 15) / 7) * 100) / 100
            : Math.round(((weeklyAmount * 30) / 7) * 100) / 100;
        cycleSubtotalText = `${currency}${cycleAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} / cycle (${parsedHoursPerWeek} hrs/wk @ ${currency}${parsedRate}/hr)`;
      }

      // Add rich notification to Notification Center
      addNotification({
        title: `Billing Updated: ${project.name}`,
        message: `Payment cycle set to ${schedLabel} with subtotal ${cycleSubtotalText}. Invoices will automatically reflect this billing schedule.`,
        type: "billing",
        link_url: "/billing",
      });

      toast?.success(
        "Billing Updated",
        `Payment cycle updated to ${schedLabel}. Invoices updated & notification logged.`
      );
      onClose();
    } catch (err: any) {
      toast?.error("Update Failed", err?.message || "Failed to update project billing");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] cursor-default my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/80 bg-secondary/30 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Edit Project Pricing & Billing
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Project: <span className="font-semibold text-foreground">{project.name}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            {/* Client & Organization Association */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>Linked Client & Organization</span>
                </label>
                {!isCreatingClient && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingClient(true)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Client</span>
                  </button>
                )}
              </div>

              {!isCreatingClient ? (
                <div className="space-y-2">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground cursor-pointer font-medium"
                  >
                    <option value="">🏢 No Client (Internal Project)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company ? `${c.company} — ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>

                  {/* Preview linked client with letter avatar */}
                  {selectedClientId && (() => {
                    const cl = clients.find((c) => c.id === selectedClientId);
                    if (!cl) return null;
                    return (
                      <div className="p-2.5 rounded-lg bg-card border border-border/80 flex items-center justify-between animate-in fade-in">
                        <div className="flex items-center space-x-2.5">
                          <ClientAvatar client={cl} size="md" />
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {cl.company || cl.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Contact: {cl.name} • {cl.email}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedClientId("")}
                          className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-1 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          Unlink
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Quick inline client creation */
                <div className="p-3 rounded-lg bg-card border border-primary/30 space-y-2.5 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary flex items-center space-x-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Quick Create Client & Link to Project</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingClient(false)}
                      className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">Company / Organization *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Corp"
                        value={newClientCompany}
                        onChange={(e) => setNewClientCompany(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-muted-foreground">Primary Contact Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Sarah Connor"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-muted-foreground">Billing / Contact Email</label>
                    <input
                      type="email"
                      placeholder="e.g. accounting@acmewidgets.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingClient(false)}
                      className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickCreateClient}
                      disabled={!newClientCompany.trim() && !newClientName.trim()}
                      className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Save & Link Client
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">Billing Currency</span>
              <div className="flex items-center space-x-1">
                {["$", "€", "£", "AED", "AUD", "CAD"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleBaseCurrencyChange(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      currency === c
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Billing Model
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBillingType("fixed")}
                  className={`flex items-start space-x-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    billingType === "fixed"
                      ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                      : "bg-secondary/20 border-border/70 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <DollarSign
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      billingType === "fixed" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs text-foreground">Fixed Price</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      Custom percentage & amount per milestone
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingType("hourly")}
                  className={`flex items-start space-x-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    billingType === "hourly"
                      ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                      : "bg-secondary/20 border-border/70 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      billingType === "hourly" ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs text-foreground">Hourly Rate</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      Rate per hour & estimated weekly commitment
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Schedule & Remittance Terms - Hourly Only */}
            {billingType === "hourly" && (
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-secondary/20 border border-border/80 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span>Payment Schedule & Remittance Terms</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {paymentSchedule === "weekly"
                      ? "Net 7 Days"
                      : paymentSchedule === "15_days"
                      ? "Net 15 Days"
                      : paymentSchedule === "30_days"
                      ? "Net 30 Days"
                      : `Net ${paymentTermsDays} Days`}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Define the recurring invoicing frequency and client settlement cycle. Due dates on invoices will automatically adjust to this schedule.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Weekly */}
                  <button
                    type="button"
                    onClick={() => handleScheduleSelect("weekly")}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      paymentSchedule === "weekly"
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-background/60 border-border/70 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">🗓️</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          paymentSchedule === "weekly"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        Net 7
                      </span>
                    </div>
                    <div className="font-bold text-xs text-foreground">Weekly Payment</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Billed every 7 days; rapid turnarounds & sprint retainer
                    </div>
                    {parsedRate > 0 && parsedHoursPerWeek > 0 ? (
                      <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px] font-mono font-bold text-primary">
                        ~{currency}{(Number(weeklyAmount) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} / wk
                      </div>
                    ) : null}
                  </button>

                  {/* Every 15 Days */}
                  <button
                    type="button"
                    onClick={() => handleScheduleSelect("15_days")}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      paymentSchedule === "15_days"
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-background/60 border-border/70 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">🌓</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          paymentSchedule === "15_days"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        Net 15
                      </span>
                    </div>
                    <div className="font-bold text-xs text-foreground">Every 15 Days</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Semi-monthly billing (1st & 15th); balanced cashflow
                    </div>
                    {parsedRate > 0 && parsedHoursPerWeek > 0 ? (
                      <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px] font-mono font-bold text-primary">
                        ~{currency}{(Math.round((Math.round(((parsedHoursPerWeek * 15) / 7) * 10) / 10) * parsedRate) || 0).toLocaleString()} / 15-days
                      </div>
                    ) : null}
                  </button>

                  {/* 30 Days */}
                  <button
                    type="button"
                    onClick={() => handleScheduleSelect("30_days")}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      paymentSchedule === "30_days"
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-background/60 border-border/70 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">🌕</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          paymentSchedule === "30_days"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        Net 30
                      </span>
                    </div>
                    <div className="font-bold text-xs text-foreground">30 Days Payment</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Standard monthly cycle; enterprise retainers & contracts
                    </div>
                    {parsedRate > 0 && parsedHoursPerWeek > 0 ? (
                      <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px] font-mono font-bold text-primary">
                        ~{currency}{(Math.round((Math.round(((parsedHoursPerWeek * 30) / 7) * 10) / 10) * parsedRate) || 0).toLocaleString()} / mo
                      </div>
                    ) : null}
                  </button>
                </div>
              </div>
            )}

            {/* Fixed Price Form with Percentage & Amount Breakdown */}
            {billingType === "fixed" ? (
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Total Project Price ({currency})
                    </label>
                    <div className="flex items-center rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-2xs">
                      <span className="px-3 py-2 bg-secondary/50 border-r border-border text-muted-foreground font-mono text-xs font-bold shrink-0 select-none">
                        {currency}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="5000"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs text-foreground font-mono outline-none border-none focus:ring-0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Milestones / Payments Count
                    </label>
                    <select
                      value={installmentsCount}
                      onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
                    >
                      <option value="1">1 Payment (Full Upfront / Delivery)</option>
                      <option value="2">2 Payments (Deposit 50% + Final 50%)</option>
                      <option value="3">3 Payments (Milestone Schedule)</option>
                      <option value="4">4 Payments (Quarterly Milestones)</option>
                      <option value="5">5 Payments</option>
                      <option value="6">6 Installments</option>
                      <option value="8">8 Payments</option>
                      <option value="10">10 Installments</option>
                      <option value="12">12 Monthly Installments</option>
                    </select>
                  </div>
                </div>

                {/* Milestone Percentage Breakdown Header */}
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        Milestone Percentages & Amounts
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          is100Percent
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {is100Percent
                          ? `✓ Total: 100% (${currency}${(Number(parsedFixed) || 0).toLocaleString()})`
                          : `Total: ${totalPercentage}% (${Math.abs(Math.round((100 - totalPercentage) * 10) / 10)}% ${totalPercentage < 100 ? "remaining" : "over"})`}
                      </span>

                      {!is100Percent && (
                        <button
                          type="button"
                          onClick={handleAutoBalance}
                          className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold transition-all cursor-pointer"
                        >
                          Auto-Balance
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground overflow-x-auto pb-1">
                    <span className="shrink-0 font-medium">Quick Splits:</span>
                    <button
                      type="button"
                      onClick={() => handleAutoBalance()}
                      className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer shrink-0"
                    >
                      Equal Split
                    </button>
                    {milestones.length === 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMilestones(buildDefaultMilestones(2, parsedFixed, "50-50"));
                        }}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer shrink-0"
                      >
                        50% / 50%
                      </button>
                    )}
                    {milestones.length === 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMilestones(buildDefaultMilestones(3, parsedFixed, "40-40-20"));
                        }}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer shrink-0"
                      >
                        40% / 40% / 20%
                      </button>
                    )}
                  </div>

                  {/* List of Milestones with Percentage & Amount Inputs */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {milestones.map((m, idx) => {
                      const isPaid = m.status === "paid";
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border transition-all space-y-2 ${
                            isPaid
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : "bg-background border-border/80"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">
                              Milestone #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleMilestonePaid(idx)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                isPaid
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                              }`}
                            >
                              {isPaid ? "✓ Paid" : "Mark Paid"}
                            </button>
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Title input */}
                            <div className="col-span-6">
                              <input
                                type="text"
                                placeholder={`Milestone #${idx + 1} Title`}
                                value={m.title}
                                onChange={(e) => handleTitleChange(idx, e.target.value)}
                                className="w-full bg-secondary/30 border border-border/80 rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary"
                              />
                            </div>

                            {/* Percentage input */}
                            <div className="col-span-3">
                              <div className="flex items-center rounded-lg border border-border/80 bg-secondary/30 overflow-hidden focus-within:border-primary">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  placeholder="25"
                                  value={m.percentage ?? ""}
                                  onChange={(e) =>
                                    handlePercentageChange(idx, e.target.value)
                                  }
                                  className="w-full bg-transparent px-2 py-1 text-xs font-mono text-foreground outline-none text-right"
                                />
                                <span className="px-1.5 py-1 text-[11px] font-bold text-muted-foreground bg-secondary/50 select-none">
                                  %
                                </span>
                              </div>
                            </div>

                            {/* Calculated Amount display */}
                            <div className="col-span-3 text-right">
                              <span className="text-xs font-mono font-bold text-foreground block">
                                {currency}
                                {(Number(m.amount) || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Hourly Form */
              <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Hourly Rate ({currency}/hr) *
                    </label>
                    <div className="flex items-center rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-2xs">
                      <span className="px-3 py-2 bg-secondary/50 border-r border-border text-muted-foreground font-mono text-xs font-bold shrink-0 select-none">
                        {currency}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="75"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs text-foreground font-mono outline-none border-none focus:ring-0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Estimated Hours / Week *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="40"
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono"
                      required
                    />
                  </div>
                </div>

                {parsedRate > 0 && parsedHoursPerWeek > 0 && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between text-blue-600 dark:text-blue-400">
                      <div className="flex flex-col">
                        <span className="font-semibold">{hourlyCycleLabel}</span>
                        {paymentSchedule !== "weekly" && (
                          <span className="text-[10px] opacity-75 font-mono">
                            ~{hourlyCycleHours} hrs {hourlyCycleUnit} @ {currency}{parsedRate}/hr
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold">
                        {currency}
                        {(Number(hourlyCycleAmount) || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {hourlyCycleUnit}
                      </span>
                    </div>

                    {project?.target_date && deadlineProjectedAmount !== null ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="font-medium">
                          Projected Total till Target Deadline ({weeksToDeadline} wks):
                        </span>
                        <span className="font-mono font-bold">
                          {currency}
                          {(Number(deadlineProjectedAmount) || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Currency Conversion Section */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/60">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Multi-Currency Conversion
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Enable to select conversion currency & display on final invoices
                    </span>
                  </div>
                </div>

                {/* Monday Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !enableConversion;
                    setEnableConversion(next);
                    if (next) {
                      updateRateInRealtime(currency, targetCurrency);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    enableConversion ? "bg-[#0073ea]" : "bg-muted-foreground/30"
                  }`}
                  role="switch"
                  aria-checked={enableConversion}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      enableConversion ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Converted Currency Configuration (Hidden by default, shown when toggle is enabled) */}
              {enableConversion && (
                <div className="p-3.5 rounded-xl bg-secondary/30 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Target Currency Selection */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground flex items-center space-x-1">
                        <Globe className="w-3 h-3 text-primary" />
                        <span>Target Conversion Currency</span>
                      </label>
                      <select
                        value={targetCurrency}
                        onChange={(e) => handleTargetCurrencyChange(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                      >
                        {SUPPORTED_CURRENCIES.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.flag} {curr.code} ({curr.symbol}) — {curr.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Exchange Rate Input */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-foreground flex items-center space-x-1.5">
                          <span>Exchange Rate (1 {currency} =)</span>
                          {isLiveRate && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Live</span>
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={handleResetDefaultRate}
                          disabled={isLoadingRate}
                          className="text-[10px] text-primary hover:underline font-medium cursor-pointer flex items-center space-x-1"
                          title="Fetch latest real-time market exchange rate"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${isLoadingRate ? "animate-spin" : ""}`} />
                          <span>{isLoadingRate ? "Syncing..." : "Live Rate"}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={conversionRate}
                          onChange={(e) => setConversionRate(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg pl-3 pr-12 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground pointer-events-none">
                          {targetCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Realtime Converted Amount Live Badge */}
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-primary tracking-wide flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        <span>Live Real-Time Converted Total</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Base: {currency}
                        {(Number(billingType === "fixed" ? parsedFixed : hourlyCycleAmount) || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {billingType === "hourly" ? hourlyCycleUnit : "total"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-primary">
                        {getCurrencyInfo(targetCurrency).symbol}
                        {(
                          (Number(billingType === "fixed" ? parsedFixed : hourlyCycleAmount) || 0) *
                          (parseFloat(conversionRate) || 1)
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {targetCurrency}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {isLiveRate ? "Real-time live exchange rate" : "Reflected on final client invoices"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bank Transfer & Wire Remittance Details */}
            <div className="p-4 rounded-2xl bg-secondary/20 border border-border/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Bank Transfer & Remittance Details
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Included automatically on project invoices & PDF downloads
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleApplyBankPreset}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                    title="Load Emirates NBD (ENBD) preset"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>⚡ Fill Emirates NBD (ENBD)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBankDetails}
                    className="px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Account Name & Bank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nevin Pandacan Alcober"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Emirates NBD (ENBD)"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </div>

              {/* IBAN & Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    IBAN *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AE790260001015470817401"
                    value={bankIban}
                    onChange={(e) => setBankIban(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1015470817401"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              {/* Currency, SWIFT Code & Routing Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Currency
                  </label>
                  <input
                    type="text"
                    placeholder="AED"
                    value={bankCurrency}
                    onChange={(e) => setBankCurrency(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    SWIFT / BIC Code
                  </label>
                  <input
                    type="text"
                    placeholder="EBILAEAD"
                    value={swiftBic}
                    onChange={(e) => setSwiftBic(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    Routing Number
                  </label>
                  <input
                    type="text"
                    placeholder="302620122"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Configured: {bankName || "Emirates NBD (ENBD)"} • IBAN: {bankIban || "AE790260001015470817401"}
                </span>
              </div>
            </div>

            {/* Payment Settlement Status */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Overall Payment Settlement Status</span>
                <span className="text-[10px] text-muted-foreground">Check if paid</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus("unpaid")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    paymentStatus === "unpaid"
                      ? "bg-slate-500/15 border-slate-500 text-foreground ring-1 ring-slate-500/30"
                      : "bg-secondary/20 border-border/70 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  ○ Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus("partially_paid")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    paymentStatus === "partially_paid"
                      ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                      : "bg-secondary/20 border-border/70 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  ◐ Partial
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus("paid")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    paymentStatus === "paid"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-secondary/20 border-border/70 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  ✓ Paid in Full
                </button>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-2 px-5 py-3 border-t border-border/80 bg-secondary/20 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#0073ea] hover:bg-[#0060c0] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Saving..." : "Save Billing Settings"}</span>
            </button>
          </div>
        </form>
      </motion.div>
      </div>
    </AnimatePresence>
  );
}
