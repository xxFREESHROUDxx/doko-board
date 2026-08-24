import { compareTasks } from "./boardModel";
import { compareDueDate, comparePriority } from "./taskMeta";
import type { Task, TaskPriority } from "../../types/api";

export const SORT_KEYS = ["PRIORITY", "DUE_DATE", "NEWEST", "TITLE"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  PRIORITY: "Priority",
  DUE_DATE: "Due date",
  NEWEST: "Newest first",
  TITLE: "Title A–Z",
};

/** Sentinels for the "no filter" and "nobody" select options. Task ids are UUIDs
 *  and priorities are enum names, so neither can collide with a real value. */
export const ANY = "ANY";
export const UNASSIGNED = "UNASSIGNED";

export interface BoardFilters {
  search: string;
  priority: TaskPriority | typeof ANY;
  assignee: string | typeof ANY | typeof UNASSIGNED;
  sort: SortKey;
}

export const DEFAULT_FILTERS: BoardFilters = {
  search: "",
  priority: ANY,
  assignee: ANY,
  sort: "PRIORITY",
};

/** Sort is excluded: reordering hides nothing, so it shouldn't offer "clear". */
export function hasActiveFilters(filters: BoardFilters): boolean {
  return (
    filters.search.trim() !== "" || filters.priority !== ANY || filters.assignee !== ANY
  );
}

export function filterTasks(tasks: Task[], filters: BoardFilters): Task[] {
  const needle = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (needle !== "" && !task.title.toLowerCase().includes(needle)) return false;
    if (filters.priority !== ANY && task.priority !== filters.priority) return false;
    if (filters.assignee === UNASSIGNED) return task.assigneeId === null;
    if (filters.assignee !== ANY && task.assigneeId !== filters.assignee) return false;
    return true;
  });
}

/** Every comparator ends in a total order, so columns never reshuffle on re-render. */
export function comparatorFor(sort: SortKey): (a: Task, b: Task) => number {
  switch (sort) {
    case "DUE_DATE":
      return (a, b) =>
        compareDueDate(a.dueDate, b.dueDate) ||
        comparePriority(a.priority, b.priority) ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id);
    case "NEWEST":
      return (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    case "TITLE":
      return (a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) ||
        a.id.localeCompare(b.id);
    case "PRIORITY":
      return compareTasks;
  }
}
