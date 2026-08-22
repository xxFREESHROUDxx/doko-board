import { describe, expect, it } from "vitest";
import { formatDueDate, isOverdue, toDateInputValue, toDueDateIso } from "./dates";

describe("due date round-tripping", () => {
  it("sends a date input value as UTC midnight", () => {
    expect(toDueDateIso("2026-08-25")).toBe("2026-08-25T00:00:00.000Z");
  });

  it("converts an API instant back to a date input value", () => {
    expect(toDateInputValue("2026-08-25T00:00:00.000Z")).toBe("2026-08-25");
  });

  it("survives a round trip", () => {
    expect(toDateInputValue(toDueDateIso("2026-01-01"))).toBe("2026-01-01");
  });
});

describe("formatDueDate", () => {
  it("formats in UTC so the day never slips west of UTC", () => {
    // Rendered in UTC regardless of the runner's timezone; a local-time
    // formatter would show 24 Aug for anyone at a negative offset.
    expect(formatDueDate("2026-08-25T00:00:00.000Z")).toMatch(/25/);
    expect(formatDueDate("2026-08-25T00:00:00.000Z")).not.toMatch(/24/);
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-08-22T12:00:00.000Z");

  it("is false for a task due today", () => {
    expect(isOverdue("2026-08-22T00:00:00.000Z", now)).toBe(false);
  });

  it("is false for a future date", () => {
    expect(isOverdue("2026-08-23T00:00:00.000Z", now)).toBe(false);
  });

  it("is true once the day has passed", () => {
    expect(isOverdue("2026-08-21T00:00:00.000Z", now)).toBe(true);
  });

  it("compares whole days, not instants", () => {
    // Due earlier *today* is still not overdue.
    expect(isOverdue("2026-08-22T01:00:00.000Z", now)).toBe(false);
  });
});
