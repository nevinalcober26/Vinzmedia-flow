"use client";

import { useId } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className = "" }: EmptyStateProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`empty-state surface-card flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center ${className}`}>
      <div className="empty-state-icon mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background text-primary" aria-hidden="true">
        <Icon className="h-7 w-7 stroke-[1.5]" />
      </div>
      <h3 id={headingId} className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          {actionLabel}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
