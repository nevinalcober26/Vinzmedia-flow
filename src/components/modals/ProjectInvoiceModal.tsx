"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { Project, Task } from "@/types";
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
  const { tasks, activeWorkspace, users, clients, toast, togglePaymentPaid } = useStore();
  const [invoiceStatus, setInvoiceStatus] = useState<"Draft" | "Issued" | "Paid">(
    project.payment_status === "paid" ? "Paid" : "Issued"
  );

  // Currency Conversion state & Real-time Live Market Rates
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
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);
  const [isLiveRate, setIsLiveRate] = useState<boolean>(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string>("");

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

  // Find linked client
  const linkedClient = clients.find((c) => c.id === project.client_id);

  if (!isOpen) return null;

  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const totalTrackedSeconds = projectTasks.reduce(
    (acc, t) => acc + (t.tracked_seconds || 0),
    0
  );
  const totalTrackedHours = (totalTrackedSeconds / 3600);
  const hourlyRate = project.hourly_rate || 0;
  const accruedEarnings = totalTrackedHours * hourlyRate;
  const currencySymbol = project.currency || "$";
  const hoursPerWeek = project.estimated_hours_per_week || project.estimated_hours || 40;
  const weeklyEstimatedAmount = hourlyRate * hoursPerWeek;

  const todayStr = new Date().toISOString().split("T")[0];
  const dueDateStr =
    project.target_date ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const invoiceNumber = `INV-${project.id.slice(0, 6).toUpperCase()}-${new Date().getFullYear()}`;

  // Fixed Price Calculations
  const isFixed = project.billing_type === "fixed";
  const fixedTotal = project.fixed_price_amount || 0;
  const installmentsCount = project.payment_installments_count || 1;
  const perInstallmentAmount = fixedTotal / installmentsCount;

  // Final Total to Bill
  const finalTotal = isFixed
    ? fixedTotal
    : accruedEarnings > 0
    ? accruedEarnings
    : weeklyEstimatedAmount;

  // Conversion calculations
  const parsedRate = parseFloat(conversionRate) || 1.0;
  const targetCurrencyInfo = getCurrencyInfo(targetCurrency);
  const convertedFinalTotal = finalTotal * parsedRate;

  const handleStatusChange = (newStatus: "Draft" | "Issued" | "Paid") => {
    setInvoiceStatus(newStatus);
    if (newStatus === "Paid") {
      togglePaymentPaid(project.id, true);
    } else if (invoiceStatus === "Paid") {
      togglePaymentPaid(project.id, false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-8"
        >
          {/* Action Bar (Screen Only - Hidden in Print) */}
          <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-border/80 bg-secondary/30">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                Project Billing Invoice Preview
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {isFixed ? "Fixed Price Contract" : "Hourly Time & Materials"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={invoiceStatus}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground cursor-pointer font-medium"
              >
                <option value="Draft">Draft</option>
                <option value="Issued">Issued</option>
                <option value="Paid">Mark as Paid</option>
              </select>

              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0073ea] hover:bg-[#0060c0] text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Download / Print PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Currency Conversion Options Bar (Screen Only - Hidden in Print) */}
          <div className="no-print px-6 py-2.5 bg-secondary/20 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className="font-semibold text-foreground flex items-center space-x-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                <span>Currency Conversion:</span>
              </span>

              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setEnableConversion(!enableConversion)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  enableConversion ? "bg-[#0073ea]" : "bg-muted-foreground/30"
                }`}
                role="switch"
                aria-checked={enableConversion}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enableConversion ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>

              <span className="text-[11px] text-muted-foreground">
                {enableConversion ? "Enabled (Reflected on invoice)" : "Disabled (Hidden by default)"}
              </span>
            </div>

            {enableConversion && (
              <div className="flex items-center space-x-2 flex-wrap animate-in fade-in">
                {/* Target Currency Select */}
                <select
                  value={targetCurrency}
                  onChange={(e) => handleTargetCurrencyChange(e.target.value)}
                  className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground cursor-pointer font-medium"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.code} ({curr.symbol})
                    </option>
                  ))}
                </select>

                {/* Rate Input */}
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    1 {project.currency || "$"} =
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(e.target.value)}
                    className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground font-mono"
                  />
                  <span className="text-[11px] font-bold text-muted-foreground font-mono">
                    {targetCurrency}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResetRate}
                  disabled={isLoadingRate}
                  className="text-[10px] text-primary hover:underline font-semibold ml-1 cursor-pointer flex items-center space-x-1"
                  title="Fetch real-time live exchange rate"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isLoadingRate ? "animate-spin" : ""}`} />
                  <span>{isLoadingRate ? "Syncing..." : "Live Rate"}</span>
                </button>
                {isLiveRate && (
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Printable Invoice Sheet */}
          <div
            id="invoice-printable-area"
            className="p-8 sm:p-10 space-y-8 bg-card text-foreground"
          >
            {/* Invoice Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-border/80">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0073ea] flex items-center justify-center text-white font-bold text-sm">
                    V
                  </div>
                  <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                    VinzMedia Platform
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground">
                  Workspace: {activeWorkspace?.name || "Corporate Internal App"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Professional Services & Software Development
                </p>
              </div>

              <div className="text-right space-y-1 sm:self-auto self-end">
                <h2 className="text-2xl font-black tracking-tight text-[#0073ea]">
                  INVOICE
                </h2>
                <p className="text-xs font-mono font-bold text-foreground">
                  #{invoiceNumber}
                </p>
                <div className="inline-block mt-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      invoiceStatus === "Paid"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    }`}
                  >
                    Status: {invoiceStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To & Invoice Meta Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] block mb-1">
                  Billed To / Project Client
                </span>
                {linkedClient ? (
                  <div className="flex items-start space-x-3 mt-1.5">
                    <ClientAvatar client={linkedClient} size="lg" rounded="xl" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-foreground">
                        {linkedClient.company || linkedClient.name}
                      </p>
                      {linkedClient.company && linkedClient.name && (
                        <p className="text-xs text-muted-foreground font-medium">
                          Attn: {linkedClient.name}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {linkedClient.email}
                      </p>
                      <p className="text-[10px] font-mono text-[#0073ea] font-medium pt-0.5">
                        Project: {project.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-sm text-foreground">{project.name}</p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">
                      {project.description || "Project Milestone & Task Deliverables"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] block mb-1">
                  Billing Terms
                </span>
                <p className="font-bold text-foreground">
                  {isFixed ? "Fixed Contract Agreement" : "Hourly Rate (Time & Materials)"}
                </p>
                <p className="text-muted-foreground mt-0.5 font-mono">
                  Currency: {currencySymbol} ({project.currency || "USD"})
                </p>
                {enableConversion && (
                  <p className="text-[#0073ea] font-medium mt-1 font-mono text-[11px]">
                    💱 1 {project.currency || "$"} = {parsedRate} {targetCurrency}
                  </p>
                )}
              </div>

              <div className="sm:text-right">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] block mb-1">
                  Important Dates
                </span>
                <p className="text-foreground">
                  <span className="text-muted-foreground">Issue Date:</span>{" "}
                  <span className="font-medium font-mono">{formatDate(todayStr)}</span>
                </p>
                <p className="text-foreground mt-0.5">
                  <span className="text-muted-foreground">Due Date:</span>{" "}
                  <span className="font-bold font-mono text-[#0073ea]">
                    {formatDate(dueDateStr)}
                  </span>
                </p>
              </div>
            </div>

            {/* Invoice Line Items Table */}
            <div className="border border-border/80 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4">Item & Description</th>
                    <th className="py-2.5 px-4 text-center">Unit / Term</th>
                    <th className="py-2.5 px-4 text-right">Rate</th>
                    <th className="py-2.5 px-4 text-right">Amount ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isFixed ? (
                    /* Fixed Price Installments with Custom Percentage & Titles */
                    (project.installments && project.installments.length > 0
                      ? project.installments
                      : Array.from({ length: installmentsCount }).map((_, idx) => ({
                          installment_number: idx + 1,
                          title:
                            idx === 0
                              ? "Upfront Project Kickoff & Initialization"
                              : idx === installmentsCount - 1
                              ? "Final Delivery & Handover Sign-off"
                              : `Milestone Phase #${idx + 1} Progress Delivery`,
                          percentage: Math.round(100 / installmentsCount),
                          amount: perInstallmentAmount,
                          status: "pending",
                        }))
                    ).map((inst: any, idx: number) => {
                      const isInstPaid = inst.status === "paid";
                      return (
                        <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <p className="font-bold text-foreground">
                                {inst.title || `Payment Milestone #${idx + 1}`}
                              </p>
                              {isInstPaid && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  PAID
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Milestone #{inst.installment_number || idx + 1} ({inst.percentage || Math.round(100 / installmentsCount)}% of total contract)
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                            {inst.percentage || Math.round(100 / installmentsCount)}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {currencySymbol}
                            {(Number(inst.amount) || perInstallmentAmount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                            {currencySymbol}
                            {(Number(inst.amount) || perInstallmentAmount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    /* Hourly Rate Breakdown */
                    <>
                      {/* Weekly commitment summary */}
                      <tr className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground">
                            Dedicated Weekly Development Allocation
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Planned capacity commitment ({hoursPerWeek} billable hours/week)
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                          {hoursPerWeek} hrs/wk
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {currencySymbol}
                          {hourlyRate.toFixed(2)}/hr
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {currencySymbol}
                          {weeklyEstimatedAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>

                      {/* Itemized Tasks with Logged Time */}
                      {projectTasks
                        .filter((t) => (t.tracked_seconds || 0) > 0)
                        .map((task) => {
                          const taskHours = (task.tracked_seconds || 0) / 3600;
                          const taskCost = taskHours * hourlyRate;
                          return (
                            <tr
                              key={task.id}
                              className="hover:bg-secondary/20 transition-colors bg-secondary/5"
                            >
                              <td className="py-2.5 px-4 pl-8">
                                <p className="font-medium text-foreground">
                                  Task: {task.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground capitalize">
                                  Status: {task.status.replace("_", " ")}
                                </p>
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-muted-foreground">
                                {taskHours.toFixed(2)} hrs
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                                {currencySymbol}
                                {hourlyRate.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-medium text-foreground">
                                {currencySymbol}
                                {taskCost.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        })}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Summary Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
              <div className="text-xs text-muted-foreground max-w-sm space-y-2">
                <div>
                  <p className="font-bold text-foreground">Payment Instructions:</p>
                  <p>
                    Please submit payment via direct bank transfer or corporate card. Reference
                    Invoice <span className="font-mono font-bold text-foreground">#{invoiceNumber}</span> on all correspondence.
                  </p>
                </div>

                {enableConversion && (
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-900 dark:text-blue-200">
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      Multi-Currency Settlement Notice:
                    </p>
                    <p className="mt-0.5 leading-relaxed">
                      Clients paying in <strong>{targetCurrencyInfo.name} ({targetCurrency})</strong> may remit{" "}
                      <strong className="font-mono text-foreground">{targetCurrencyInfo.symbol}{convertedFinalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetCurrency}</strong>{" "}
                      at the locked rate of <strong>1 {project.currency || "$"} = {parsedRate} {targetCurrency}</strong>.
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-80 space-y-2 text-xs">
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {currencySymbol}
                    {finalTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Tax (0%):</span>
                  <span className="font-mono text-foreground">{currencySymbol}0.00</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-foreground/80 text-sm font-bold text-foreground">
                  <span>Total Amount Due:</span>
                  <span className="font-mono text-base text-[#0073ea]">
                    {currencySymbol}
                    {finalTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Highlighted Converted Total on Final Invoice */}
                {enableConversion && (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 text-foreground space-y-1 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      <span className="flex items-center space-x-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>Converted Payable Total:</span>
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        1 {project.currency || "$"} = {parsedRate}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                      <span className="text-[11px] text-muted-foreground">In {targetCurrency}:</span>
                      <span className="font-mono text-lg font-extrabold text-[#0073ea]">
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

            {/* Footer Note */}
            <div className="pt-6 border-t border-border/60 text-center text-[11px] text-muted-foreground">
              <p>Thank you for your business. Generated securely by VinzMedia Project Management Platform.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
