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
} from "lucide-react";
import { Project, Task } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatDate } from "@/lib/utils";

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
  const { tasks, currentWorkspace, users, toast, togglePaymentPaid } = useStore();
  const [invoiceStatus, setInvoiceStatus] = useState<"Draft" | "Issued" | "Paid">(
    project.payment_status === "paid" ? "Paid" : "Issued"
  );

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

  const handleStatusChange = (newStatus: "Draft" | "Issued" | "Paid") => {
    setInvoiceStatus(newStatus);
    if (newStatus === "Paid") {
      togglePaymentPaid(project.id, true);
    } else if (invoiceStatus === "Paid" && newStatus !== "Paid") {
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
                  Workspace: {currentWorkspace?.name || "Corporate Internal App"}
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
                <p className="font-bold text-sm text-foreground">{project.name}</p>
                <p className="text-muted-foreground mt-0.5 line-clamp-2">
                  {project.description || "Project Milestone & Task Deliverables"}
                </p>
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
              <div className="text-xs text-muted-foreground max-w-sm space-y-1">
                <p className="font-bold text-foreground">Payment Instructions:</p>
                <p>
                  Please submit payment via direct bank transfer or corporate card. Reference
                  Invoice <span className="font-mono font-bold text-foreground">#{invoiceNumber}</span> on all correspondence.
                </p>
              </div>

              <div className="w-full sm:w-72 space-y-2 text-xs">
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
