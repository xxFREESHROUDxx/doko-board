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
 * Whether a due date has passed, compared date-to-date in UTC so a task due
 * today never reads as overdue regardless of the viewer's timezone.
 */
export function isOverdue(iso: string, now: Date = new Date()): boolean {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = new Date(iso);
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return dueDay < today;
}
