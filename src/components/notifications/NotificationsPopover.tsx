"use client";

import React, { useRef, useEffect, useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  MessageSquare,
  UserPlus,
  Users,
  AlertTriangle,
  AlertCircle,
  Megaphone,
  ExternalLink,
  X,
  Receipt,
  CreditCard,
  FileText,
  DollarSign,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { NotificationType } from "@/types";

interface NotificationsPopoverProps {
  onClose: () => void;
}

export function NotificationsPopover({ onClose }: NotificationsPopoverProps) {
  const {
    notifications,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    setActiveView,
    setEditingTask,
    tasks,
  } = useStore();

  const [activeFilter, setActiveFilter] = useState<"all" | "delayed" | "invoices" | "team">("all");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const userNotifications = notifications.filter(
    (n) => n.user_id === currentUser.id || !n.user_id
  );

  // Categorized counts
  const delayedCount = userNotifications.filter(
    (n) =>
      n.type === "delayed_payment" ||
      n.type === "delayed_task" ||
      n.title.toLowerCase().includes("delayed") ||
      n.title.toLowerCase().includes("overdue")
  ).length;

  const invoiceCount = userNotifications.filter(
    (n) =>
      n.type === "invoice" ||
      n.type === "billing" ||
      n.title.toLowerCase().includes("invoice") ||
      n.title.toLowerCase().includes("billing")
  ).length;

  const teamCount = userNotifications.filter(
    (n) =>
      n.type === "team" ||
      n.type === "task_assigned" ||
      n.title.toLowerCase().includes("team") ||
      n.title.toLowerCase().includes("member")
  ).length;

  const filteredNotifications = userNotifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "delayed") {
      return (
        n.type === "delayed_payment" ||
        n.type === "delayed_task" ||
        n.title.toLowerCase().includes("delayed") ||
        n.title.toLowerCase().includes("overdue")
      );
    }
    if (activeFilter === "invoices") {
      return (
        n.type === "invoice" ||
        n.type === "billing" ||
        n.title.toLowerCase().includes("invoice") ||
        n.title.toLowerCase().includes("billing")
      );
    }
    if (activeFilter === "team") {
      return (
        n.type === "team" ||
        n.type === "task_assigned" ||
        n.title.toLowerCase().includes("team") ||
        n.title.toLowerCase().includes("member")
      );
    }
    return true;
  });

  const getIcon = (type: NotificationType, title?: string) => {
    switch (type) {
      case "delayed_payment":
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      case "delayed_task":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case "team":
        return <Users className="w-3.5 h-3.5 text-emerald-500" />;
      case "invoice":
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case "billing":
        return <Receipt className="w-3.5 h-3.5 text-blue-500" />;
      case "task_assigned":
        return <UserPlus className="w-3.5 h-3.5 text-blue-500" />;
      case "comment":
        return <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />;
      case "deadline":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      case "announcement":
        return <Megaphone className="w-3.5 h-3.5 text-purple-500" />;
      case "status_change":
      case "system":
      default:
        if (title?.toLowerCase().includes("delayed payment") || title?.toLowerCase().includes("overdue payment")) {
          return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
        }
        if (title?.toLowerCase().includes("delayed task") || title?.toLowerCase().includes("overdue task")) {
          return <Clock className="w-3.5 h-3.5 text-amber-500" />;
        }
        if (title?.toLowerCase().includes("team") || title?.toLowerCase().includes("member")) {
          return <Users className="w-3.5 h-3.5 text-emerald-500" />;
        }
        if (title?.toLowerCase().includes("invoice")) {
          return <FileText className="w-3.5 h-3.5 text-blue-500" />;
        }
        if (title?.toLowerCase().includes("billing")) {
          return <Receipt className="w-3.5 h-3.5 text-blue-500" />;
        }
        return <Bell className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  const getTypeBadge = (type: NotificationType, title?: string) => {
    if (type === "delayed_payment" || title?.toLowerCase().includes("delayed payment") || title?.toLowerCase().includes("overdue payment")) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
          Delayed Payment
        </span>
      );
    }
    if (type === "delayed_task" || title?.toLowerCase().includes("delayed task") || title?.toLowerCase().includes("overdue task")) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
          Delayed Task
        </span>
      );
    }
    if (type === "team" || title?.toLowerCase().includes("team") || title?.toLowerCase().includes("member")) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
          Team
        </span>
      );
    }
    if (type === "invoice" || title?.toLowerCase().includes("invoice")) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          Invoice Ready
        </span>
      );
    }
    if (type === "billing") {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
          Billing
        </span>
      );
    }
    return null;
  };

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    markNotificationRead(notif.id);
    if (notif.link_url) {
      if (notif.link_url.startsWith("/timelogs")) {
        sessionStorage.setItem("vinzflow_weekly_review_target", notif.link_url.split("?")[1] || "");
        setActiveView("timelogs");
        window.dispatchEvent(new Event("vinzflow:weekly-review"));
      } else if (notif.link_url.startsWith("/tasks/")) {
        const taskId = notif.link_url.replace("/tasks/", "");
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          setEditingTask(task);
        }
      } else if (notif.link_url.includes("announcement")) {
        setActiveView("announcements");
      } else if (notif.link_url.includes("team") || notif.type === "team") {
        setActiveView("team");
      } else if (
        notif.link_url.includes("billing") ||
        notif.link_url.includes("invoice") ||
        notif.type === "billing" ||
        notif.type === "invoice" ||
        notif.type === "delayed_payment"
      ) {
        setActiveView("billing");
      }
    } else if (notif.type === "delayed_payment" || notif.type === "invoice" || notif.type === "billing") {
      setActiveView("billing");
    } else if (notif.type === "team") {
      setActiveView("team");
    } else if (notif.type === "delayed_task") {
      setActiveView("dashboard");
    }
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="absolute right-0 top-10 w-84 md:w-96 rounded-2xl bg-card border border-border shadow-2xl z-50 text-card-foreground animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-secondary/30">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-foreground" />
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {userNotifications.filter((n) => !n.is_read).length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                {userNotifications.filter((n) => !n.is_read).length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={markAllNotificationsRead}
              title="Mark all as read"
              className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={clearAllNotifications}
              title="Clear all"
              className="p-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center space-x-1 px-3 py-2 border-b border-border/60 bg-muted/20 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === "all"
                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            All ({userNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("delayed")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
              activeFilter === "delayed"
                ? "bg-rose-500 text-white shadow-2xs font-bold"
                : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
            }`}
          >
            <span>⚠️ Delayed</span>
            {delayedCount > 0 && <span className="opacity-90 font-mono">({delayedCount})</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("invoices")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
              activeFilter === "invoices"
                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <span>📄 Invoices</span>
            {invoiceCount > 0 && <span className="opacity-90 font-mono">({invoiceCount})</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("team")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1 ${
              activeFilter === "team"
                ? "bg-emerald-600 text-white shadow-2xs font-bold"
                : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
            }`}
          >
            <span>👥 Team</span>
            {teamCount > 0 && <span className="opacity-90 font-mono">({teamCount})</span>}
          </button>
        </div>

        {/* Notifications list */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="font-medium text-foreground">
                {activeFilter === "delayed"
                  ? "No delayed items!"
                  : activeFilter === "invoices"
                  ? "No invoice alerts."
                  : activeFilter === "team"
                  ? "No team updates."
                  : "All caught up!"}
              </p>
              <p className="mt-0.5 text-[11px]">
                {activeFilter === "delayed"
                  ? "All tasks and project payments are on schedule."
                  : "You are up to date on all notifications."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 flex items-start space-x-3 text-left transition-colors cursor-pointer hover:bg-secondary/40 ${
                  !notif.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                    notif.type === "delayed_payment"
                      ? "bg-rose-500/10 border border-rose-500/20"
                      : notif.type === "delayed_task"
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : notif.type === "team"
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : notif.type === "invoice"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-secondary"
                  }`}
                >
                  {getIcon(notif.type, notif.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <p
                      className={`text-xs truncate ${
                        !notif.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {getTypeBadge(notif.type, notif.title)}
                      {!notif.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center space-x-1">
                    <Clock className="w-2.5 h-2.5 opacity-60" />
                    <span>{formatRelativeTime(notif.created_at)}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}