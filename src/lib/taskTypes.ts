export interface TaskTypeConfig {
  id: string;
  name: string;
  color: string;
  bg: string;
  text: string;
  border: string;
  iconName?: string;
  defaultDepartment?: string;
}

export const DEFAULT_TASK_TYPES: TaskTypeConfig[] = [
  {
    id: "Development",
    name: "Development",
    color: "#3b82f6",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    iconName: "Code2",
    defaultDepartment: "Engineering",
  },
  {
    id: "Marketing",
    name: "Marketing",
    color: "#ec4899",
    bg: "bg-pink-500/10",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/20",
    iconName: "Megaphone",
    defaultDepartment: "Marketing & Growth",
  },
  {
    id: "Design",
    name: "Design",
    color: "#8b5cf6",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
    iconName: "Palette",
    defaultDepartment: "Design & Creative",
  },
  {
    id: "QA",
    name: "QA / Testing",
    color: "#10b981",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    iconName: "CheckCircle2",
    defaultDepartment: "QA & Security",
  },
  {
    id: "Content",
    name: "Content & Copy",
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    iconName: "FileText",
    defaultDepartment: "Marketing & Growth",
  },
  {
    id: "Operations",
    name: "Operations",
    color: "#06b6d4",
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20",
    iconName: "Settings2",
    defaultDepartment: "Operations & HR",
  },
  {
    id: "Research",
    name: "Research & Strategy",
    color: "#6366f1",
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
    iconName: "Sparkles",
    defaultDepartment: "Product Management",
  },
];

export const DEFAULT_DEPARTMENTS: string[] = [
  "Engineering",
  "Design & Creative",
  "Marketing & Growth",
  "Product Management",
  "QA & Security",
  "Operations & HR",
  "Sales & Client Success",
];

export function getTaskTypeBadge(type?: string): TaskTypeConfig {
  if (!type) return DEFAULT_TASK_TYPES[0];
  const found = DEFAULT_TASK_TYPES.find(
    (t) => t.id.toLowerCase() === type.toLowerCase() || t.name.toLowerCase() === type.toLowerCase()
  );
  if (found) return found;

  // Custom dynamically added type
  return {
    id: type,
    name: type,
    color: "#64748b",
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/20",
    defaultDepartment: "General",
  };
}

export function getDepartmentBadge(dept?: string) {
  const d = (dept || "Engineering").toLowerCase();
  if (d.includes("eng") || d.includes("dev")) {
    return { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" };
  }
  if (d.includes("design") || d.includes("creative")) {
    return { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" };
  }
  if (d.includes("market") || d.includes("growth")) {
    return { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" };
  }
  if (d.includes("product")) {
    return { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20" };
  }
  if (d.includes("qa") || d.includes("security")) {
    return { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" };
  }
  return { bg: "bg-secondary", text: "text-muted-foreground", border: "border-border" };
}
