"use client";

import React, { useRef, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  Megaphone,
  ExternalLink,
  X,
  Receipt,
  CreditCard,
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

  const getIcon = (type: NotificationType, title?: string) => {
    switch (type) {
      case "task_assigned":
        return <UserPlus className="w-3.5 h-3.5 text-blue-500" />;
      case "comment":
        return <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />;
      case "deadline":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      case "announcement":
        return <Megaphone className="w-3.5 h-3.5 text-purple-500" />;
      case "billing":
      case "invoice":
        return <Receipt className="w-3.5 h-3.5 text-blue-500" />;
      case "status_change":
      case "system":
      default:
        if (title?.toLowerCase().includes("billing") || title?.toLowerCase().includes("invoice")) {
          return <Receipt className="w-3.5 h-3.5 text-blue-500" />;
        }
        return <Bell className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  const handleNotificationClick = (notif: (typeof notifications)[0]) => {
    markNotificationRead(notif.id);
    if (notif.link_url) {
      if (notif.link_url.startsWith("/tasks/")) {
        const taskId = notif.link_url.replace("/tasks/", "");
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          setEditingTask(task);
        }
      } else if (notif.link_url.includes("announcement")) {
        setActiveView("announcements");
      } else if (
        notif.link_url.includes("billing") ||
        notif.link_url.includes("invoice") ||
        notif.type === "billing" ||
        notif.type === "invoice"
      ) {
        setActiveView("billing");
      }
    } else if (notif.type === "billing" || notif.type === "invoice") {
      setActiveView("billing");
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
        className="absolute right-0 top-10 w-80 md:w-96 rounded-2xl bg-card border border-border shadow-2xl z-50 text-card-foreground animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
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

      {/* Notifications list */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
        {userNotifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="mt-0.5">No notifications at the moment.</p>
          </div>
        ) : (
          userNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3 flex items-start space-x-3 text-left transition-colors cursor-pointer hover:bg-secondary/40 ${
                !notif.is_read ? "bg-primary/5" : ""
              }`}
            >
              <div className="p-1.5 rounded-lg bg-secondary flex-shrink-0 mt-0.5">
                {getIcon(notif.type, notif.title)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p
                    className={`text-xs truncate ${
                      !notif.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                    }`}
                  >
                    {notif.title}
                  </p>
                  {!notif.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                  {notif.message}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {formatRelativeTime(notif.created_at)}
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
