import type { ChipTone } from "../../components/Chip";
import type { TaskPriority, TaskStatus } from "../../types/api";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const TASK_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Not started",
  IN_PROGRESS: "On progress",
  IN_REVIEW: "On review",
  DONE: "Completed",
};

// Full class strings so Tailwind's scanner sees them.
export const STATUS_DOTS: Record<TaskStatus, string> = {
  TODO: "bg-stone-400",
  IN_PROGRESS: "bg-pine-700",
  IN_REVIEW: "bg-marigold-500",
  DONE: "bg-emerald-600",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** Colour always rides alongside the text label — never the only signal. */
export const PRIORITY_TONES: Record<TaskPriority, ChipTone> = {
  URGENT: "red",
  HIGH: "orange",
  MEDIUM: "marigold",
  LOW: "neutral",
};

/** Most urgent first. Mirrors the API's `priority: 'desc'` over the Prisma enum. */
const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function comparePriority(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_RANK[a] - PRIORITY_RANK[b];
}

/** Soonest first, undated last — matches the API's `nulls: 'last'`. */
export function compareDueDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}
