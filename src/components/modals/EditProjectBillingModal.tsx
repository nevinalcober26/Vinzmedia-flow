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
} from "lucide-react";
import { Project, ProjectBillingType } from "@/types";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";

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

  useEffect(() => {
    if (isOpen) {
      setBillingType(project.billing_type || "fixed");
      setFixedAmount(String(project.fixed_price_amount || "5000"));
      setInstallmentsCount(project.payment_installments_count || 3);
      setHourlyRate(String(project.hourly_rate || "75"));
      setHoursPerWeek(
        String(project.estimated_hours_per_week || project.estimated_hours || "40")
      );
      setCurrency(project.currency || "$");
      setPaymentStatus(project.payment_status || "unpaid");
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const parsedFixed = parseFloat(fixedAmount) || 0;
  const parsedRate = parseFloat(hourlyRate) || 0;
  const parsedHoursPerWeek = parseFloat(hoursPerWeek) || 0;
  const weeklyAmount = parsedRate * parsedHoursPerWeek;

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
        payment_status: paymentStatus,
        last_payment_date: paymentStatus === "paid" ? new Date().toISOString() : project.last_payment_date,
      };

      if (billingType === "fixed") {
        updates.fixed_price_amount = parsedFixed;
        updates.payment_installments_count = installmentsCount;
      } else {
        updates.hourly_rate = parsedRate;
        updates.estimated_hours_per_week = parsedHoursPerWeek;
        updates.estimated_hours = parsedHoursPerWeek;
      }

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
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
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
                {["$", "€", "£", "AED", "CAD", "AUD"].map((c) => (
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
                      Fixed contract with milestone payments
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
                      Tracked hours per week
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Fixed Price Form */}
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
                      Installments Count
                    </label>
                    <select
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
                    >
                      <option value="1">1 Payment (Full Upfront / Delivery)</option>
                      <option value="2">2 Payments (50% Deposit + 50% Final)</option>
                      <option value="3">3 Payments (Milestone Schedule)</option>
                      <option value="4">4 Payments (Quarterly Milestones)</option>
                      <option value="5">5 Payments</option>
                      <option value="6">6 Installments</option>
                      <option value="10">10 Installments</option>
                      <option value="12">12 Monthly Installments</option>
                    </select>
                  </div>
                </div>

                {parsedFixed > 0 && installmentsCount > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="font-medium">Calculated per installment:</span>
                    <span className="font-mono font-bold">
                      {currency}
                      {(parsedFixed / installmentsCount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      / payment
                    </span>
                  </div>
                )}
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

            {/* Payment Settlement Status */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Payment Settlement Status</span>
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
