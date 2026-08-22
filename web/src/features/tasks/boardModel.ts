import { TASK_STATUSES, compareDueDate, comparePriority } from "./taskMeta";
import type { Task, TaskStatus } from "../../types/api";

export type TasksByStatus = Record<TaskStatus, Task[]>;

/** Urgent first, then soonest due, then newest — the same order the API returns. */
export function compareTasks(a: Task, b: Task): number {
  const byPriority = comparePriority(a.priority, b.priority);
  if (byPriority !== 0) return byPriority;

  const byDueDate = compareDueDate(a.dueDate, b.dueDate);
  if (byDueDate !== 0) return byDueDate;

  // Newest first, and a deterministic tiebreak so columns never reshuffle.
  return b.createdAt.localeCompare(a.createdAt);
}

/** Splits a flat task list into the four board columns, each sorted. */
export function groupTasksByStatus(tasks: Task[]): TasksByStatus {
  const groups: TasksByStatus = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };

  for (const task of tasks) {
    // An unrecognised status (a future enum value) would otherwise throw here.
    groups[task.status]?.push(task);
  }
  for (const status of TASK_STATUSES) {
    groups[status].sort(compareTasks);
  }

  return groups;
}
