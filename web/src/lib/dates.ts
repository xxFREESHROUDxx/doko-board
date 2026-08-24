/**
 * Due dates are day-granular, but the API stores them as a DateTime. Both ends
 * are pinned to UTC midnight: we send "T00:00:00.000Z" and format in UTC.
 * Formatting in local time would render the previous day for anyone west of UTC.
 */
const dueDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDueDate(iso: string): string {
  return dueDateFormatter.format(new Date(iso));
}

/** "2026-08-25" (from <input type="date">) -> the instant the API expects. */
export function toDueDateIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

/** An API instant -> the "yyyy-mm-dd" an <input type="date"> wants. */
export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Whether a due date has passed, compared whole day to whole day.
 *
 * "Today" is the viewer's *local* calendar day, projected onto the same UTC
 * scale the due date is pinned to. Using the UTC day here instead would mark a
 * task due today as overdue for anyone west of UTC once their evening crosses
 * UTC midnight — the exact failure this function exists to avoid.
 */
export function isOverdue(iso: string, now: Date = new Date()): boolean {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(iso);
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return dueDay < today;
}
