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

describe("isOverdue across the local/UTC date boundary", () => {
  // The suite runs in America/Los_Angeles (see vite.config.ts), so an evening
  // local time is already the next day in UTC. Comparing against the UTC day
  // would call a task due today overdue while the viewer's calendar disagrees.
  const eveningLocalNextDayUtc = new Date("2026-08-23T01:00:00.000Z");

  it("is still the local day, not the UTC one", () => {
    expect(eveningLocalNextDayUtc.getDate()).toBe(22);
    expect(eveningLocalNextDayUtc.getUTCDate()).toBe(23);
  });

  it("does not mark today's task overdue in the local evening", () => {
    expect(isOverdue("2026-08-22T00:00:00.000Z", eveningLocalNextDayUtc)).toBe(false);
  });

  it("still marks genuinely past dates overdue", () => {
    expect(isOverdue("2026-08-21T00:00:00.000Z", eveningLocalNextDayUtc)).toBe(true);
  });

  it("formats the stored day regardless of the viewer's zone", () => {
    // Pinned to UTC in the formatter; a local formatter would render 24 Aug here.
    expect(formatDueDate("2026-08-25T00:00:00.000Z")).toMatch(/25/);
  });
});
