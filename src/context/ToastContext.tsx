"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  X,
  HelpCircle,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "delete";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    delete: (title: string, message?: string, duration?: number) => void;
  };
  confirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast("success", title, message, duration),
    error: (title: string, message?: string, duration?: number) =>
      addToast("error", title, message, duration),
    warning: (title: string, message?: string, duration?: number) =>
      addToast("warning", title, message, duration),
    info: (title: string, message?: string, duration?: number) =>
      addToast("info", title, message, duration),
    delete: (title: string, message?: string, duration?: number) =>
      addToast("delete", title, message, duration),
  };

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmModal(options);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(null);
    setIsConfirming(false);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    try {
      setIsConfirming(true);
      await confirmModal.onConfirm();
    } finally {
      setIsConfirming(false);
      setConfirmModal(null);
    }
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case "delete":
        return <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-indigo-400 shrink-0" />;
    }
  };

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-card/95 text-foreground shadow-emerald-500/10";
      case "error":
        return "border-rose-500/30 bg-card/95 text-foreground shadow-rose-500/10";
      case "warning":
        return "border-amber-500/30 bg-card/95 text-foreground shadow-amber-500/10";
      case "delete":
        return "border-rose-500/30 bg-card/95 text-foreground shadow-rose-500/10";
      case "info":
      default:
        return "border-indigo-500/30 bg-card/95 text-foreground shadow-indigo-500/10";
    }
  };

  return (
    <ToastContext.Provider value={{ toast, confirm, closeConfirm }}>
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className={`pointer-events-auto rounded-2xl border backdrop-blur-xl p-4 shadow-xl flex items-start space-x-3.5 relative overflow-hidden transition-all ${getToastStyle(
                t.type
              )}`}
            >
              {/* Left Accent Glow line */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  t.type === "success"
                    ? "bg-emerald-500"
                    : t.type === "error" || t.type === "delete"
                    ? "bg-rose-500"
                    : t.type === "warning"
                    ? "bg-amber-500"
                    : "bg-indigo-500"
                }`}
              />

              {getToastIcon(t.type)}

              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-xs font-bold leading-tight tracking-tight text-foreground">
                  {t.title}
                </h4>
                {t.message && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    {t.message}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal Dialog */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 400 }}
              className="w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl p-6 text-card-foreground space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    confirmModal.variant === "danger"
                      ? "bg-rose-500/15 text-rose-500 border border-rose-500/20"
                      : confirmModal.variant === "warning"
                      ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                      : "bg-primary/15 text-primary border border-primary/20"
                  }`}
                >
                  {confirmModal.variant === "danger" ? (
                    <Trash2 className="w-5 h-5" />
                  ) : confirmModal.variant === "warning" ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <HelpCircle className="w-5 h-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onCancel?.();
                    closeConfirm();
                  }}
                  disabled={isConfirming}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                >
                  {confirmModal.cancelText || "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={isConfirming}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                    confirmModal.variant === "danger"
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                  }`}
                >
                  <span>
                    {isConfirming
                      ? "Processing..."
                      : confirmModal.confirmText || "Confirm"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}

export function useConfirm() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ToastProvider");
  }
  return context.confirm;
}
