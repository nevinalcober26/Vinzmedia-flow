import type { ProjectPaymentInstallment } from "@/types";

// Saved rows can contain duplicate installment numbers or an older, longer schedule.
// Reconcile by number rather than array position so paid records keep their identity.
export function reconcilePaymentMilestones(
  existing: ProjectPaymentInstallment[],
  defaults: ProjectPaymentInstallment[],
  total: number,
): ProjectPaymentInstallment[] {
  return defaults.map((fallback) => {
    const saved = existing.find(
      (item) => item.installment_number === fallback.installment_number,
    );
    if (!saved) return fallback;
    const percentage = saved.percentage ?? fallback.percentage ?? 0;
    return {
      ...saved,
      title: saved.title || fallback.title,
      percentage,
      amount: Math.round(total * percentage) / 100,
      status: saved.status || "pending",
    };
  });
}
