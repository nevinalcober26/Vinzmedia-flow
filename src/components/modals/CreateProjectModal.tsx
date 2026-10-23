"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, FolderKanban, Calendar, AlertCircle, Palette, Check, Globe, Lock, Users, Info, DollarSign, Clock, Coins, Building2, UserPlus } from "lucide-react";
import { PriorityLevel, ProjectStatus, ProjectBillingType } from "@/types";
import { DEFAULT_TASK_TYPES, DEFAULT_DEPARTMENTS } from "@/lib/taskTypes";
import { ClientAvatar } from "@/components/common/ClientAvatar";

export function CreateProjectModal() {
  const {
    isCreateProjectModalOpen,
    setIsCreateProjectModalOpen,
    createProject,
    clients,
    createClient,
    users,
    currentUser,
    setSelectedProjectId,
  } = useStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [priority, setPriority] = useState<PriorityLevel>("high");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [targetDate, setTargetDate] = useState("");
  const [accessScope, setAccessScope] = useState<"all" | "specific">("all");
  const [memberIds, setMemberIds] = useState<string[]>([currentUser.id]);

  // Client link & quick create
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  // Pricing & Billing
  const [billingType, setBillingType] = useState<ProjectBillingType>("fixed");
  const [fixedAmount, setFixedAmount] = useState<string>("5000");
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [hourlyRate, setHourlyRate] = useState<string>("75");
  const [estimatedHours, setEstimatedHours] = useState<string>("50");

  const handleQuickCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientCompany.trim() && !newClientName.trim()) return;
    const created = createClient({
      name: newClientName.trim() || newClientCompany.trim(),
      company: newClientCompany.trim() || newClientName.trim(),
      email: newClientEmail.trim(),
      status: "active",
      project_ids: [],
    });
    if (created) {
      setSelectedClientId(created.id);
      setIsCreatingClient(false);
      setNewClientName("");
      setNewClientCompany("");
      setNewClientEmail("");
    }
  };

  const handleClose = () => {
    setIsCreateProjectModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedFixed = parseFloat(fixedAmount) || 0;
    const parsedRate = parseFloat(hourlyRate) || 0;
    const parsedEst = parseFloat(estimatedHours) || 0;

    // Generate installments if fixed
    const generatedInstallments = [];
    if (billingType === "fixed" && installmentsCount > 0 && parsedFixed > 0) {
      const equalPct = Math.round((100 / installmentsCount) * 10) / 10;
      for (let i = 1; i <= installmentsCount; i++) {
        const pct =
          i === installmentsCount
            ? Math.max(0, Math.round((100 - equalPct * (installmentsCount - 1)) * 10) / 10)
            : equalPct;
        const perInstallment = Math.round(((parsedFixed * pct) / 100) * 100) / 100;
        generatedInstallments.push({
          id: `inst_${Date.now()}_${i}`,
          project_id: "",
          installment_number: i,
          title:
            i === 1
              ? "Deposit / Upfront Kickoff"
              : i === installmentsCount
              ? "Final Milestone / Delivery"
              : `Milestone #${i} Delivery`,
          percentage: pct,
          amount: perInstallment,
          status: "pending" as const,
        });
      }
    }

    const newProj = createProject({
      name: name.trim(),
      description: description.trim(),
      color,
      priority,
      status,
      target_date: targetDate || undefined,
      all_members: accessScope === "all",
      member_ids: accessScope === "all" ? users.map((u) => u.id) : memberIds,
      client_id: selectedClientId || undefined,
      billing_type: billingType,
      fixed_price_amount: billingType === "fixed" ? parsedFixed : 0,
      payment_installments_count: billingType === "fixed" ? installmentsCount : 1,
      installments: generatedInstallments,
      hourly_rate: billingType === "hourly" ? parsedRate : 0,
      estimated_hours: billingType === "hourly" ? parsedEst : 0,
      estimated_hours_per_week: billingType === "hourly" ? parsedEst : 0,
      enable_currency_conversion: false,
      converted_currency: "PHP",
      conversion_rate: 57.5,
      task_types: DEFAULT_TASK_TYPES.map((t) => t.name),
      departments: DEFAULT_DEPARTMENTS,
    });

    if (newProj) {
      setSelectedProjectId(newProj.id);
      setName("");
      setDescription("");
      setSelectedClientId("");
      setIsCreatingClient(false);
      setAccessScope("all");
      setMemberIds([currentUser.id]);
      handleClose();
    }
  };

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSelectAllMembers = () => {
    setMemberIds(users.map((u) => u.id));
  };

  const handleClearMembers = () => {
    setMemberIds([currentUser.id]);
  };

  const colorPalette = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#ef4444", // Red
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
  ];

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isCreateProjectModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateProjectModalOpen]);

  return (
    <AnimatePresence>
      {isCreateProjectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-lg max-h-[88vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30 shrink-0">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Create New Project</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Project Name *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Mobile App Redesign v3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Project purpose, target milestones, objectives..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none transition-all"
                  />
                </div>

              {/* Color Palette Picker */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground flex items-center space-x-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Theme Accent Color</span>
                </label>
                <div className="flex items-center space-x-2.5">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        color === c ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:scale-110"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Priority & Target Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Priority</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground cursor-pointer"
                  >
                    <option value="urgent">🔴 Urgent — High organizational priority</option>
                    <option value="high">🟠 High — Core sprint project</option>
                    <option value="medium">🟡 Medium — Regular development</option>
                    <option value="low">🟢 Low — Experimental / Backlog</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Target Deadline</span>
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-2.5 py-2 text-xs text-foreground cursor-pointer"
                  />
                </div>
              </div>

              {/* Client & Organization Association */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>Client & Organization</span>
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
                      className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer font-medium"
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
                      const client = clients.find((c) => c.id === selectedClientId);
                      if (!client) return null;
                      return (
                        <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/80 flex items-center justify-between animate-in fade-in">
                          <div className="flex items-center space-x-2.5">
                            <ClientAvatar client={client} size="md" />
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {client.company || client.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Contact: {client.name} • {client.email}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedClientId("")}
                            className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-1 rounded-md hover:bg-destructive/10 transition-colors"
                          >
                            Unlink
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Quick inline client creation */
                  <div className="p-3.5 rounded-xl bg-secondary/40 border border-primary/30 space-y-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary flex items-center space-x-1">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Quick Create Client & Link to Project</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingClient(false)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
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
                        className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground"
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

              {/* Project Pricing & Billing Model */}
              <div className="space-y-2.5 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center space-x-1.5">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    <span>Project Pricing & Billing</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {billingType === "fixed" ? "Milestone / Fixed Contract" : "Time & Materials"}
                  </span>
                </div>

                {/* Billing Type Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingType("fixed")}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      billingType === "fixed"
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <DollarSign className={`w-4 h-4 mt-0.5 shrink-0 ${billingType === "fixed" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground">Fixed Price</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">Set total amount & installments</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingType("hourly")}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      billingType === "hourly"
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${billingType === "hourly" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground">Hourly Rate</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">Bill based on tracked hours</div>
                    </div>
                  </button>
                </div>

                {/* Fixed Price Configuration */}
                {billingType === "fixed" ? (
                  <div className="p-3 rounded-2xl bg-secondary/20 border border-border/70 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Total Project Amount</label>
                        <div className="flex items-center rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                          <span className="px-2.5 py-1.5 bg-secondary/50 border-r border-border text-muted-foreground font-mono text-xs font-bold shrink-0 select-none">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="5000"
                            value={fixedAmount}
                            onChange={(e) => setFixedAmount(e.target.value)}
                            className="w-full bg-transparent px-2.5 py-1.5 text-xs text-foreground font-mono outline-none border-none focus:ring-0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-foreground">Number of Payments</label>
                        <select
                          value={installmentsCount}
                          onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                          className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground cursor-pointer"
                        >
                          <option value="1">1 Payment (Full Upfront / Delivery)</option>
                          <option value="2">2 Payments (Deposit 50% + Final 50%)</option>
                          <option value="3">3 Payments (Deposit + Mid + Final)</option>
                          <option value="4">4 Payments (Quarterly Milestones)</option>
                          <option value="5">5 Payments</option>
                          <option value="6">6 Monthly Installments</option>
                        </select>
                      </div>
                    </div>

                    {/* Calculated Installment Summary */}
                    {parseFloat(fixedAmount) > 0 && installmentsCount > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-primary/10 border border-primary/20 text-[11px] text-primary">
                        <span className="font-medium">Estimated Per Payment:</span>
                        <span className="font-mono font-bold">
                          ${(parseFloat(fixedAmount) / installmentsCount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / installment
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Hourly Rate Configuration */
                  (() => {
                    const parsedR = parseFloat(hourlyRate) || 0;
                    const parsedH = parseFloat(estimatedHours) || 0;
                    const weeklyAmt = parsedR * parsedH;

                    let weeksToDeadline: number | null = null;
                    let deadlineProjectedAmt: number | null = null;
                    if (targetDate) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const deadline = new Date(targetDate);
                      deadline.setHours(0, 0, 0, 0);
                      const diffTime = deadline.getTime() - today.getTime();
                      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                      if (diffDays > 0) {
                        weeksToDeadline = Math.max(1, Math.round((diffDays / 7) * 10) / 10);
                        deadlineProjectedAmt = weeklyAmt * weeksToDeadline;
                      }
                    }

                    return (
                      <div className="p-3 rounded-2xl bg-secondary/20 border border-border/70 space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">Hourly Rate ($ / hr) *</label>
                            <div className="flex items-center rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                              <span className="px-2.5 py-1.5 bg-secondary/50 border-r border-border text-muted-foreground font-mono text-xs font-bold shrink-0 select-none">$</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="75"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                className="w-full bg-transparent px-2.5 py-1.5 text-xs text-foreground font-mono outline-none border-none focus:ring-0"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-foreground">Estimated Hours / Week *</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="40"
                              value={estimatedHours}
                              onChange={(e) => setEstimatedHours(e.target.value)}
                              className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-mono"
                            />
                          </div>
                        </div>

                        {parsedR > 0 && parsedH > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400">
                              <span className="font-medium">Total Amount Per Week:</span>
                              <span className="font-mono font-bold">
                                ${weeklyAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / week
                              </span>
                            </div>

                            {targetDate && deadlineProjectedAmt !== null && (
                              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400">
                                <span className="font-medium">
                                  Total Amount till Deadline ({weeksToDeadline} wks):
                                </span>
                                <span className="font-mono font-bold">
                                  ${deadlineProjectedAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Project Member Visibility & Access Control */}
              <div className="space-y-2.5 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Project Access & Visibility</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {accessScope === "all" ? "Open to entire team" : `${memberIds.length} members assigned`}
                  </span>
                </div>

                {/* Scope selector buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessScope("all")}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accessScope === "all"
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Globe className={`w-4 h-4 mt-0.5 shrink-0 ${accessScope === "all" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground">All Team Members</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">Visible to everyone in this workspace</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessScope("specific")}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accessScope === "specific"
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${accessScope === "specific" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground">Specific Members</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">Restricted to selected teammates</div>
                    </div>
                  </button>
                </div>

                {/* Specific Members Picker */}
                {accessScope === "specific" && (
                  <div className="space-y-2 p-3 rounded-2xl bg-secondary/20 border border-border/70 animate-in fade-in zoom-in-98 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground">
                        Select Teammates for this Project:
                      </span>
                      <div className="flex items-center space-x-2 text-[10px]">
                        <button
                          type="button"
                          onClick={handleSelectAllMembers}
                          className="text-primary hover:underline font-medium cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-muted-foreground">•</span>
                        <button
                          type="button"
                          onClick={handleClearMembers}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {users.map((u) => {
                        const isSelected = memberIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleMember(u.id)}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border/60"
                            }`}
                          >
                            <UserAvatar name={u.full_name} avatarUrl={u.avatar_url} size="xs" showStatus={false} />
                            <span>{u.full_name}</span>
                            {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-start space-x-1.5 pt-1 text-[10px] text-muted-foreground">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                      <span>
                        Only the selected teammates (plus Workspace Admins) will be able to view, access, or see tasks in this project.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 px-5 py-3 border-t border-border bg-secondary/20 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </form>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
