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
} from "lucide-react";
import { Project, ProjectBillingType, ProjectPaymentInstallment } from "@/types";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import {
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
  getDefaultExchangeRate,
  formatCurrencyAmount,
} from "@/lib/currencyRates";

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
  const { updateProject } = useStore();
  const toast = useToast();

  const [billingType, setBillingType] = useState<ProjectBillingType>(
    project.billing_type || "fixed"
  );
  const [fixedAmount, setFixedAmount] = useState<string>(
    String(project.fixed_price_amount || "5000")
  );
  const [installmentsCount, setInstallmentsCount] = useState<number>(
    project.payment_installments_count || 3
  );
  const [milestones, setMilestones] = useState<ProjectPaymentInstallment[]>([]);

  const [hourlyRate, setHourlyRate] = useState<string>(
    String(project.hourly_rate || "75")
  );
  const [hoursPerWeek, setHoursPerWeek] = useState<string>(
    String(project.estimated_hours_per_week || project.estimated_hours || "40")
  );
  const [currency, setCurrency] = useState<string>(project.currency || "$");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partially_paid" | "paid">(
    project.payment_status || "unpaid"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Currency Conversion state
  const [enableConversion, setEnableConversion] = useState<boolean>(
    project.enable_currency_conversion || false
  );
  const [targetCurrency, setTargetCurrency] = useState<string>(
    project.converted_currency || "PHP"
  );
  const [conversionRate, setConversionRate] = useState<string>(
    project.conversion_rate
      ? String(project.conversion_rate)
      : String(getDefaultExchangeRate(project.currency || "$", "PHP"))
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
        id: `inst_${project.id}_${i}`,
        project_id: project.id,
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
      const currentFixed = project.fixed_price_amount || 5000;
      setFixedAmount(String(currentFixed));
      const currentCount = project.payment_installments_count || 3;
      setInstallmentsCount(currentCount);
      setHourlyRate(String(project.hourly_rate || "75"));
      setHoursPerWeek(
        String(project.estimated_hours_per_week || project.estimated_hours || "40")
      );
      setCurrency(project.currency || "$");
      setPaymentStatus(project.payment_status || "unpaid");

      // Currency conversion initialization
      setEnableConversion(project.enable_currency_conversion || false);
      const targetCurr = project.converted_currency || "PHP";
      setTargetCurrency(targetCurr);
      setConversionRate(
        project.conversion_rate
          ? String(project.conversion_rate)
          : String(getDefaultExchangeRate(project.currency || "$", targetCurr))
      );

      // Load existing installments or generate default
      const existing = project.installments || [];
      if (existing.length > 0) {
        setMilestones(
          existing.map((inst, idx) => {
            const pct =
              inst.percentage !== undefined
                ? inst.percentage
                : Math.round((100 / existing.length) * 10) / 10;
            const amt =
              inst.amount || Math.round(((currentFixed * pct) / 100) * 100) / 100;
            return {
              ...inst,
              installment_number: idx + 1,
              title: inst.title || `Payment #${idx + 1}`,
              percentage: pct,
              amount: amt,
              status: inst.status || "pending",
            };
          })
        );
      } else {
        setMilestones(buildDefaultMilestones(currentCount, currentFixed));
      }
    }
  }, [isOpen, project]);

  // Handle count change
  const handleCountChange = (newCount: number) => {
    setInstallmentsCount(newCount);
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

  const handleTargetCurrencyChange = (newTarget: string) => {
    setTargetCurrency(newTarget);
    setConversionRate(String(getDefaultExchangeRate(currency, newTarget)));
  };

  const handleResetDefaultRate = () => {
    setConversionRate(String(getDefaultExchangeRate(currency, targetCurrency)));
  };

  if (!isOpen) return null;

  const totalPercentage = Math.round(
    milestones.reduce((acc, m) => acc + (m.percentage || 0), 0) * 10
  ) / 10;
  const is100Percent = totalPercentage === 100;

  let weeksToDeadline: number | null = null;
  let deadlineProjectedAmount: number | null = null;

  if (project.target_date) {
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

      // Currency conversion updates
      updates.enable_currency_conversion = enableConversion;
      updates.converted_currency = targetCurrency;
      updates.conversion_rate = parseFloat(conversionRate) || 1.0;

      updateProject(project.id, updates);
      toast?.success("Billing Updated", `Updated pricing model for ${project.name}`);
      onClose();
    } catch (err: any) {
      toast?.error("Update Failed", err?.message || "Failed to update project billing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-secondary/30">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Edit Project Pricing & Billing
                </h2>
                <p className="text-xs text-muted-foreground">
                  Project: <span className="font-semibold text-foreground">{project.name}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
            {/* Currency Selector */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">Billing Currency</span>
              <div className="flex items-center space-x-1">
                {["$", "€", "£", "AED", "AUD", "CAD"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
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
                          ? `✓ Total: 100% (${currency}${parsedFixed.toLocaleString()})`
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
                                {m.amount.toLocaleString(undefined, {
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
                      <span className="font-medium">Total Amount Per Week:</span>
                      <span className="font-mono font-bold">
                        {currency}
                        {weeklyAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        / week
                      </span>
                    </div>

                    {project.target_date && deadlineProjectedAmount !== null ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="font-medium">
                          Projected Total till Target Deadline ({weeksToDeadline} wks):
                        </span>
                        <span className="font-mono font-bold">
                          {currency}
                          {deadlineProjectedAmount.toLocaleString(undefined, {
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
                  onClick={() => setEnableConversion(!enableConversion)}
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
                        <label className="text-[11px] font-semibold text-foreground">
                          Exchange Rate (1 {currency} =)
                        </label>
                        <button
                          type="button"
                          onClick={handleResetDefaultRate}
                          className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                          title="Reset to market benchmark rate"
                        >
                          Auto Rate
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
                      <span className="text-[10px] uppercase font-bold text-primary tracking-wide block">
                        Live Converted Total
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Base: {currency}
                        {(billingType === "fixed" ? parsedFixed : weeklyAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {billingType === "hourly" ? "/ week" : "total"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-primary">
                        {getCurrencyInfo(targetCurrency).symbol}
                        {(
                          (billingType === "fixed" ? parsedFixed : weeklyAmount) *
                          (parseFloat(conversionRate) || 1)
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {targetCurrency}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Reflected on final client invoices
                      </span>
                    </div>
                  </div>
                </div>
              )}
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

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#0073ea] hover:bg-[#0060c0] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
