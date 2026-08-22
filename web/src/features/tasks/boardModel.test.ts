import { describe, expect, it } from "vitest";
import { compareTasks, groupTasksByStatus } from "./boardModel";
import type { Task, TaskPriority, TaskStatus } from "../../types/api";

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

function titlesOf(tasks: Task[]): string[] {
  return tasks.map((t) => t.title);
}

describe("groupTasksByStatus", () => {
  it("always returns all four columns, even when empty", () => {
    const groups = groupTasksByStatus([]);
    expect(Object.keys(groups)).toEqual(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
    expect(Object.values(groups).every((column) => column.length === 0)).toBe(true);
  });

  it("files each task under its status", () => {
    const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const groups = groupTasksByStatus(statuses.map((status) => task({ status })));

    for (const status of statuses) {
      expect(groups[status]).toHaveLength(1);
      expect(groups[status][0].status).toBe(status);
    }
  });

  it("ignores a status the client doesn't know about", () => {
    // Guards against a future backend enum value crashing the board.
    const rogue = task({ status: "ARCHIVED" as TaskStatus });
    expect(() => groupTasksByStatus([rogue])).not.toThrow();
    expect(groupTasksByStatus([rogue, task()]).TODO).toHaveLength(1);
  });
});

describe("compareTasks", () => {
  it("puts the most urgent first", () => {
    const priorities: TaskPriority[] = ["LOW", "URGENT", "MEDIUM", "HIGH"];
    const sorted = priorities.map((priority) => task({ priority, title: priority })).sort(compareTasks);
    expect(titlesOf(sorted)).toEqual(["URGENT", "HIGH", "MEDIUM", "LOW"]);
  });

  it("breaks priority ties by soonest due date", () => {
    const sorted = [
      task({ title: "later", dueDate: "2026-03-01T00:00:00.000Z" }),
      task({ title: "sooner", dueDate: "2026-02-01T00:00:00.000Z" }),
    ].sort(compareTasks);
    expect(titlesOf(sorted)).toEqual(["sooner", "later"]);
  });

  it("sinks undated tasks below dated ones", () => {
    const sorted = [
      task({ title: "undated", dueDate: null }),
      task({ title: "dated", dueDate: "2026-02-01T00:00:00.000Z" }),
    ].sort(compareTasks);
    expect(titlesOf(sorted)).toEqual(["dated", "undated"]);
  });

  it("ranks priority above due date", () => {
    const sorted = [
      task({ title: "low-but-urgent-date", priority: "LOW", dueDate: "2026-01-01T00:00:00.000Z" }),
      task({ title: "urgent", priority: "URGENT", dueDate: "2099-01-01T00:00:00.000Z" }),
    ].sort(compareTasks);
    expect(titlesOf(sorted)).toEqual(["urgent", "low-but-urgent-date"]);
  });

  it("is deterministic when everything else ties", () => {
    const a = task({ title: "a", createdAt: "2026-01-01T00:00:00.000Z" });
    const b = task({ title: "b", createdAt: "2026-02-01T00:00:00.000Z" });
    expect(titlesOf([a, b].sort(compareTasks))).toEqual(["b", "a"]);
    expect(titlesOf([b, a].sort(compareTasks))).toEqual(["b", "a"]);
  });
});
