import { TASK_STATUSES, compareDueDate, comparePriority } from "./taskMeta";
import type { Task, TaskStatus } from "../../types/api";

export type TasksByStatus = Record<TaskStatus, Task[]>;

/** Urgent first, then soonest due, then newest — the same order the API returns. */
export function compareTasks(a: Task, b: Task): number {
  const byPriority = comparePriority(a.priority, b.priority);
  if (byPriority !== 0) return byPriority;

  const byDueDate = compareDueDate(a.dueDate, b.dueDate);
  if (byDueDate !== 0) return byDueDate;

  // Newest first, then id: without the id the order is only as stable as the
  // sort implementation, and two tasks created in the same millisecond swap.
  return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Splits a flat task list into the four board columns, each sorted. The
 * comparator is a parameter so the toolbar's sort control can swap it without
 * this function knowing anything about filters.
 */
export function groupTasksByStatus(
  tasks: Task[],
  compare: (a: Task, b: Task) => number = compareTasks,
): TasksByStatus {
  const groups: TasksByStatus = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };

  for (const task of tasks) {
    // An unrecognised status (a future enum value) would otherwise throw here.
    groups[task.status]?.push(task);
  }
  for (const status of TASK_STATUSES) {
    groups[status].sort(compare);
  }

  return groups;
}
