import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Board } from "./Board";
import { renderWithProviders, testUser } from "../../test/utils";
import { apiRequest } from "../../lib/apiClient";
import type { ProjectMember, Task } from "../../types/api";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const membership: ProjectMember[] = [
  { id: "pm-1", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z", user: testUser },
];

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write the changelog",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    dueDate: null,
    projectId: PROJECT_ID,
    assigneeId: null,
    createdById: testUser.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

interface StubOptions {
  /** Thrown from PATCH instead of applying the change. */
  patchError?: unknown;
  /** Held open so the test can assert the in-flight UI. */
  patchGate?: Promise<void>;
}

/**
 * A small stateful stand-in for the API: writes land in `tasks`, and the next
 * GET returns them. That makes cache invalidation observable — if a mutation
 * forgets to invalidate, the board never shows the change.
 */
function stubApi(initial: Task[], { patchError, patchGate }: StubOptions = {}) {
  const tasks = [...initial];

  mockedApiRequest.mockImplementation(async (path: string, options = {}) => {
    const method = options.method ?? "GET";

    if (path === `/projects/${PROJECT_ID}/members`) return membership as never;
    if (path === `/projects/${PROJECT_ID}/tasks` && method === "GET") {
      return [...tasks] as never;
    }
    if (path === `/projects/${PROJECT_ID}/tasks` && method === "POST") {
      const created = task({
        ...(options.body as Partial<Task>),
        id: `task-${tasks.length + 1}`,
      });
      tasks.push(created);
      return created as never;
    }

    const match = /\/tasks\/(?<id>[^/]+)$/.exec(path);
    const index = tasks.findIndex((item) => item.id === match?.groups?.id);

    if (method === "PATCH") {
      if (patchGate) await patchGate;
      if (patchError) throw patchError;
      tasks[index] = { ...tasks[index], ...(options.body as Partial<Task>) };
      return tasks[index] as never;
    }
    if (method === "DELETE") {
      tasks.splice(index, 1);
      return null as never;
    }
    return null as never;
  });

  return tasks;
}

function column(label: string) {
  return screen.getByRole("region", { name: new RegExp(`^${label}`) });
}

/** Request bodies for a given method, in order. */
function bodies(method: string): unknown[] {
  return mockedApiRequest.mock.calls
    .filter(([, options]) => options?.method === method)
    .map(([, options]) => options?.body);
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("Board task movement", () => {
  it("moves a card to another column with a status PATCH", async () => {
    stubApi([task()]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.selectOptions(
      await screen.findByLabelText("Status for Write the changelog"),
      "IN_PROGRESS",
    );

    // Only the status is sent — a move must not rewrite the rest of the task.
    await waitFor(() => expect(bodies("PATCH")).toEqual([{ status: "IN_PROGRESS" }]));
    expect(mockedApiRequest.mock.calls.find(([, o]) => o?.method === "PATCH")?.[0]).toBe(
      `/projects/${PROJECT_ID}/tasks/task-1`,
    );

    // The refetch after invalidation is what actually relocates the card.
    await waitFor(() =>
      expect(within(column("On progress")).getByText("Write the changelog")).toBeVisible(),
    );
    expect(
      within(column("Not started")).queryByText("Write the changelog"),
    ).not.toBeInTheDocument();
  });

  it("updates the column counts after a move", async () => {
    stubApi([task(), task({ id: "task-2", title: "Second task" })]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    expect(await screen.findByRole("region", { name: "Not started (2)" })).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText("Status for Second task"),
      "DONE",
    );

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Not started (1)" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("region", { name: "Completed (1)" })).toBeInTheDocument();
  });

  it("confirms the move with a toast naming the destination", async () => {
    stubApi([task()]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.selectOptions(
      await screen.findByLabelText("Status for Write the changelog"),
      "IN_REVIEW",
    );

    expect(
      await screen.findByText('"Write the changelog" moved to on review'),
    ).toBeInTheDocument();
  });

  it("leaves the card where it was when the server refuses the move", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    stubApi([task()], { patchError: new ApiError(403, "You cannot edit this task") });
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.selectOptions(
      await screen.findByLabelText("Status for Write the changelog"),
      "DONE",
    );

    expect(await screen.findByText("You cannot edit this task")).toBeInTheDocument();
    expect(within(column("Not started")).getByText("Write the changelog")).toBeVisible();
    expect(within(column("Completed")).queryByText("Write the changelog")).toBeNull();
  });

  it("marks the moving card busy without taking it out of the tab order", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    stubApi([task(), task({ id: "task-2", title: "Second task" })], { patchGate: gate });
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.selectOptions(
      await screen.findByLabelText("Status for Write the changelog"),
      "IN_PROGRESS",
    );

    const moving = () => screen.getByLabelText("Status for Write the changelog");
    await waitFor(() => expect(moving()).toHaveAttribute("aria-busy", "true"));

    // Busy, never disabled: disabling the element that currently has focus blurs
    // it, which would drop a keyboard user back to <body> mid-board.
    expect(moving()).toBeEnabled();
    expect(screen.getByLabelText("Status for Second task")).not.toHaveAttribute("aria-busy");

    release();
    await waitFor(() =>
      expect(within(column("On progress")).getByText("Write the changelog")).toBeVisible(),
    );
  });
});

describe("Board task creation", () => {
  it("creates a task from a column and shows it in that column", async () => {
    stubApi([]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Create task" }));
    await userEvent.type(screen.getByLabelText("Title"), "Plan the sprint");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "IN_REVIEW");
    // The empty state behind the modal offers "Create task" too — submit the form's.
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create task" }));

    await waitFor(() =>
      expect(within(column("On review")).getByText("Plan the sprint")).toBeVisible(),
    );
    // No manual refresh: the list came back through invalidation.
    expect(bodies("POST")).toHaveLength(1);
  });

  it("pre-selects the column whose add button was used", async () => {
    stubApi([task()]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Add a task to Completed" }),
    );

    expect(screen.getByLabelText("Status")).toHaveValue("DONE");
  });

  it("dismisses the modal without creating anything", async () => {
    stubApi([task()]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Add a task to On review" }));
    await userEvent.type(screen.getByLabelText("Title"), "Never mind");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByLabelText("Title")).not.toBeInTheDocument());
    expect(bodies("POST")).toHaveLength(0);
  });
});

describe("Board task detail round trip", () => {
  it("opens the drawer from a card and shows the edit on the board", async () => {
    stubApi([task()]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Write the changelog" }));

    const title = await screen.findByLabelText("Title");
    expect(title).toHaveValue("Write the changelog");

    await userEvent.clear(title);
    await userEvent.type(title, "Write the release notes");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(within(column("Not started")).getByText("Write the release notes")).toBeVisible(),
    );
  });

  it("removes the card once the task is deleted", async () => {
    const tasks = stubApi([task()]);
    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.click(await screen.findByRole("button", { name: "Write the changelog" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete task" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));

    await waitFor(() => expect(tasks).toHaveLength(0));
    // The board falls back to its empty state rather than a ghost card.
    expect(await screen.findByText("No tasks yet")).toBeInTheDocument();
  });
});

describe("Board concurrent moves", () => {
  it("still reports a failed move that a second move began during", async () => {
    // With one board-level mutation observer, starting the second move detaches
    // the observer from the first — query-core then delivers the first result to
    // nobody, so a rejected move showed no error at all.
    const { ApiError } = await import("../../lib/apiClient");
    let failFirstMove = () => {};
    const firstMoveSettled = new Promise<void>((resolve) => {
      failFirstMove = resolve;
    });

    const tasks = [task(), task({ id: "task-2", title: "Second task" })];

    mockedApiRequest.mockImplementation(async (path: string, options = {}) => {
      const method = options.method ?? "GET";
      if (path === `/projects/${PROJECT_ID}/members`) return membership as never;
      if (path === `/projects/${PROJECT_ID}/tasks` && method === "GET") {
        return [...tasks] as never;
      }
      if (method === "PATCH" && path.endsWith("/task-1")) {
        await firstMoveSettled;
        throw new ApiError(403, "You cannot move this task");
      }
      if (method === "PATCH" && path.endsWith("/task-2")) {
        tasks[1] = { ...tasks[1], ...(options.body as Partial<Task>) };
        return tasks[1] as never;
      }
      return null as never;
    });

    renderWithProviders(<Board projectId={PROJECT_ID} />);

    await userEvent.selectOptions(
      await screen.findByLabelText("Status for Write the changelog"),
      "IN_PROGRESS",
    );
    // Overtakes the first, which is still in flight.
    await userEvent.selectOptions(screen.getByLabelText("Status for Second task"), "DONE");

    failFirstMove();

    expect(await screen.findByText("You cannot move this task")).toBeInTheDocument();
  });
});
