import type { Project, ProjectPaymentInstallment } from "@/types";

export function getConfiguredPaymentMilestones(project: Pick<Project,
  "id" | "installments" | "payment_installments_count" | "fixed_price_amount"
>): ProjectPaymentInstallment[] {
  const count = project.payment_installments_count || 3;
  const total = project.fixed_price_amount || 0;
  const equalPercentage = Math.round(1000 / count) / 10;
  const defaults: ProjectPaymentInstallment[] = Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const percentage = number === count
      ? Math.round((100 - equalPercentage * (count - 1)) * 10) / 10
      : equalPercentage;
    return {
      id: `inst_${project.id}_${number}`,
      project_id: project.id,
      installment_number: number,
      title: number === 1 ? "Deposit / Upfront Kickoff"
        : number === count ? "Final Delivery & Handover" : `Milestone #${number} Delivery`,
      percentage,
      amount: Math.round(total * percentage) / 100,
      status: "pending",
    };
  });
  return reconcilePaymentMilestones(project.installments || [], defaults, total);
}

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
