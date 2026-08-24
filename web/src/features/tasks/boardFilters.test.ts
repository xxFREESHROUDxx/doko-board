import { describe, expect, it } from "vitest";
import {
  ANY,
  DEFAULT_FILTERS,
  SORT_KEYS,
  UNASSIGNED,
  comparatorFor,
  filterTasks,
  hasActiveFilters,
} from "./boardFilters";
import type { Task } from "../../types/api";

let seq = 0;

function task(overrides: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `task-${seq}`,
    title: `Task ${seq}`,
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    dueDate: null,
    projectId: "project-1",
    assigneeId: null,
    createdById: null,
    createdAt: `2026-01-${String(seq).padStart(2, "0")}T00:00:00.000Z`,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const ADA = "user-ada";
const GRACE = "user-grace";

describe("hasActiveFilters", () => {
  it("is false for the defaults", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it("ignores sort — reordering hides nothing", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: "TITLE" })).toBe(false);
  });

  it("ignores whitespace-only search", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: "   " })).toBe(false);
  });

  it("is true once something is actually filtered", () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: "a" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, priority: "HIGH" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, assignee: ADA })).toBe(true);
  });
});

describe("filterTasks", () => {
  const tasks = [
    task({ title: "Weave the basket", priority: "HIGH", assigneeId: ADA }),
    task({ title: "Carry the load", priority: "LOW", assigneeId: GRACE }),
    task({ title: "Repair a BASKET strap", priority: "HIGH", assigneeId: null }),
  ];

  it("returns everything by default", () => {
    expect(filterTasks(tasks, DEFAULT_FILTERS)).toHaveLength(3);
  });

  it("matches titles case-insensitively, anywhere in the string", () => {
    const result = filterTasks(tasks, { ...DEFAULT_FILTERS, search: "basket" });
    expect(result.map((t) => t.title)).toEqual([
      "Weave the basket",
      "Repair a BASKET strap",
    ]);
  });

  it("trims the search term", () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, search: "  load  " })).toHaveLength(1);
  });

  it("filters by priority", () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, priority: "HIGH" })).toHaveLength(2);
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, priority: "URGENT" })).toHaveLength(0);
  });

  it("filters by assignee", () => {
    const result = filterTasks(tasks, { ...DEFAULT_FILTERS, assignee: ADA });
    expect(result.map((t) => t.title)).toEqual(["Weave the basket"]);
  });

  it("filters to unassigned tasks", () => {
    const result = filterTasks(tasks, { ...DEFAULT_FILTERS, assignee: UNASSIGNED });
    expect(result.map((t) => t.title)).toEqual(["Repair a BASKET strap"]);
  });

  it("combines filters", () => {
    const result = filterTasks(tasks, {
      ...DEFAULT_FILTERS,
      search: "basket",
      priority: "HIGH",
      assignee: UNASSIGNED,
    });
    expect(result.map((t) => t.title)).toEqual(["Repair a BASKET strap"]);
  });

  it("never mutates the input", () => {
    const input = [...tasks];
    filterTasks(input, { ...DEFAULT_FILTERS, search: "basket" });
    expect(input).toEqual(tasks);
  });

  it("treats ANY as no constraint", () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, priority: ANY, assignee: ANY })).toHaveLength(
      3,
    );
  });
});

describe("comparatorFor", () => {
  function titlesSortedBy(sort: Parameters<typeof comparatorFor>[0], tasks: Task[]) {
    return [...tasks].sort(comparatorFor(sort)).map((t) => t.title);
  }

  it("sorts by due date, undated last", () => {
    const tasks = [
      task({ title: "none", dueDate: null }),
      task({ title: "late", dueDate: "2026-06-01T00:00:00.000Z" }),
      task({ title: "early", dueDate: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(titlesSortedBy("DUE_DATE", tasks)).toEqual(["early", "late", "none"]);
  });

  it("puts the newest first", () => {
    const tasks = [
      task({ title: "older", createdAt: "2026-01-01T00:00:00.000Z" }),
      task({ title: "newer", createdAt: "2026-05-01T00:00:00.000Z" }),
    ];
    expect(titlesSortedBy("NEWEST", tasks)).toEqual(["newer", "older"]);
  });

  it("sorts titles case-insensitively", () => {
    const tasks = [
      task({ title: "banana" }),
      task({ title: "Apple" }),
      task({ title: "cherry" }),
    ];
    expect(titlesSortedBy("TITLE", tasks)).toEqual(["Apple", "banana", "cherry"]);
  });

  it("keeps priority as the default ordering", () => {
    const tasks = [task({ title: "low", priority: "LOW" }), task({ title: "urgent", priority: "URGENT" })];
    expect(titlesSortedBy("PRIORITY", tasks)).toEqual(["urgent", "low"]);
  });

  it("is a total order for every sort key, so ties never reshuffle", () => {
    // Identical on every field a comparator looks at except the id, so only the
    // id tiebreak can separate them. Without it the order is merely as stable as
    // whatever Array#sort happens to do.
    const shared = {
      title: "same",
      priority: "MEDIUM" as const,
      dueDate: "2026-03-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const a = { ...task(shared), id: "aaa" };
    const b = { ...task(shared), id: "bbb" };

    for (const key of SORT_KEYS) {
      const forward = [a, b].sort(comparatorFor(key)).map((t) => t.id);
      const reversed = [b, a].sort(comparatorFor(key)).map((t) => t.id);
      expect(forward, `sort key ${key}`).toEqual(["aaa", "bbb"]);
      expect(reversed, `sort key ${key}`).toEqual(["aaa", "bbb"]);
    }
  });
});
