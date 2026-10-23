export interface MondayStatusOption {
  key: string;
  label: string;
  bg: string;
  hoverBg: string;
  textColor: string;
}

export interface MondayPriorityOption {
  key: string;
  label: string;
  bg: string;
  textColor: string;
}

export const MONDAY_STATUSES: Record<string, MondayStatusOption> = {
  done: {
    key: "done",
    label: "Done",
    bg: "#00c875",
    hoverBg: "#00b268",
    textColor: "#ffffff",
  },
  in_progress: {
    key: "in_progress",
    label: "Working on it",
    bg: "#fdab3d",
    hoverBg: "#e89a32",
    textColor: "#ffffff",
  },
  in_review: {
    key: "in_review",
    label: "Waiting for Review",
    bg: "#579bfc",
    hoverBg: "#468be8",
    textColor: "#ffffff",
  },
  todo: {
    key: "todo",
    label: "Not Started",
    bg: "#c4c4c4",
    hoverBg: "#b0b0b0",
    textColor: "#ffffff",
  },
  backlog: {
    key: "backlog",
    label: "Backlog",
    bg: "#a25ddc",
    hoverBg: "#8e4ac8",
    textColor: "#ffffff",
  },
  stuck: {
    key: "stuck",
    label: "Stuck",
    bg: "#e2445c",
    hoverBg: "#cc394f",
    textColor: "#ffffff",
  },
};

export const MONDAY_PRIORITIES: Record<string, MondayPriorityOption> = {
  urgent: {
    key: "urgent",
    label: "Critical ⚡",
    bg: "#333333",
    textColor: "#ffffff",
  },
  high: {
    key: "high",
    label: "High",
    bg: "#e2445c",
    textColor: "#ffffff",
  },
  medium: {
    key: "medium",
    label: "Medium",
    bg: "#579bfc",
    textColor: "#ffffff",
  },
  low: {
    key: "low",
    label: "Low",
    bg: "#00c875",
    textColor: "#ffffff",
  },
};

export const MONDAY_GROUP_COLORS = [
  "#0073ea", // Signature Monday Blue
  "#00c875", // Monday Green
  "#a25ddc", // Monday Purple
  "#fdab3d", // Monday Orange
  "#e2445c", // Monday Coral
  "#579bfc", // Monday Sky
  "#ff5ac4", // Monday Pink
  "#20c997", // Monday Teal
];

/**
 * Calculates percentage segments for Monday.com battery bar
 */
export function calculateStatusBattery(tasks: { status: string }[]) {
  if (!tasks.length) return [];
  const counts: Record<string, number> = {};
  tasks.forEach((t) => {
    counts[t.status] = (counts[t.status] || 0) + 1;
  });

  return Object.entries(counts).map(([statusKey, count]) => {
    const config = MONDAY_STATUSES[statusKey] || {
      label: statusKey,
      bg: "#797e93",
      textColor: "#ffffff",
    };
    const percentage = Math.round((count / tasks.length) * 100);
    return {
      statusKey,
      label: config.label,
      bg: config.bg,
      count,
      percentage,
    };
  });
}

export function calculatePriorityBattery(tasks: { priority: string }[]) {
  if (!tasks.length) return [];
  const counts: Record<string, number> = {};
  tasks.forEach((t) => {
    counts[t.priority] = (counts[t.priority] || 0) + 1;
  });

  return Object.entries(counts).map(([priorityKey, count]) => {
    const config = MONDAY_PRIORITIES[priorityKey] || {
      label: priorityKey,
      bg: "#797e93",
      textColor: "#ffffff",
    };
    const percentage = Math.round((count / tasks.length) * 100);
    return {
      priorityKey,
      label: config.label,
      bg: config.bg,
      count,
      percentage,
    };
  });
}
