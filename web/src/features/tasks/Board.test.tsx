import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
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
    projectId: PROJECT_ID,
    assigneeId: null,
    createdById: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const membership: ProjectMember[] = [
  { id: "pm-1", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z", user: testUser },
];

function stubApi(tasks: Task[], options: { tasksFail?: boolean } = {}) {
  mockedApiRequest.mockImplementation(async (path: string) => {
    if (path === `/projects/${PROJECT_ID}/members`) return membership as never;
    if (path === `/projects/${PROJECT_ID}/tasks`) {
      if (options.tasksFail) {
        const { ApiError } = await import("../../lib/apiClient");
        throw new ApiError(500, "Board is down");
      }
      return tasks as never;
    }
    return null as never;
  });
}

function renderBoard() {
  return renderWithProviders(<Board projectId={PROJECT_ID} />);
}

function column(label: string) {
  return screen.getByRole("region", { name: new RegExp(`^${label}`) });
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  seq = 0; // titles are generated, so each test must start from "Task 1"
});

describe("Board", () => {
  it("renders the four status columns with counts", async () => {
    stubApi([
      task({ status: "TODO" }),
      task({ status: "TODO" }),
      task({ status: "IN_PROGRESS" }),
      task({ status: "DONE" }),
    ]);
    renderBoard();

    expect(await screen.findByRole("region", { name: "Not started (2)" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "On progress (1)" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "On review (0)" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Completed (1)" })).toBeInTheDocument();
  });

  it("files each task into the column for its status", async () => {
    stubApi([
      task({ status: "IN_REVIEW", title: "Needs a look" }),
      task({ status: "DONE", title: "Shipped" }),
    ]);
    renderBoard();

    await screen.findByText("Needs a look");
    expect(within(column("On review")).getByText("Needs a look")).toBeInTheDocument();
    expect(within(column("Completed")).getByText("Shipped")).toBeInTheDocument();
  });

  it("orders a column by priority, then due date", async () => {
    stubApi([
      task({ title: "low", priority: "LOW" }),
      task({ title: "urgent", priority: "URGENT" }),
      task({ title: "medium-soon", priority: "MEDIUM", dueDate: "2026-02-01T00:00:00.000Z" }),
      task({ title: "medium-later", priority: "MEDIUM", dueDate: "2026-09-01T00:00:00.000Z" }),
    ]);
    renderBoard();

    await screen.findByText("urgent");
    const headings = within(column("Not started"))
      .getAllByRole("heading", { level: 4 })
      .map((node) => node.textContent);
    expect(headings).toEqual(["urgent", "medium-soon", "medium-later", "low"]);
  });

  it("shows an empty column placeholder", async () => {
    stubApi([task({ status: "TODO" })]);
    renderBoard();

    await screen.findByText("Task 1");
    expect(within(column("Completed")).getByText(/Nothing completed/i)).toBeInTheDocument();
  });

  it("invites the first task when the board is empty", async () => {
    stubApi([]);
    renderBoard();

    expect(await screen.findByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Not started/ })).not.toBeInTheDocument();
  });

  it("resolves the assignee through the member map", async () => {
    stubApi([task({ assigneeId: testUser.id })]);
    renderBoard();

    expect(
      await screen.findByRole("img", { name: `Assigned to ${testUser.username}` }),
    ).toBeInTheDocument();
  });

  it("says so when the assignee has left the project", async () => {
    stubApi([task({ assigneeId: "someone-who-left" })]);
    renderBoard();

    expect(
      await screen.findByRole("img", { name: /no longer a member/i }),
    ).toBeInTheDocument();
  });

  it("spells out an overdue date rather than relying on colour", async () => {
    stubApi([task({ dueDate: "2020-01-02T00:00:00.000Z" })]);
    renderBoard();

    expect(await screen.findByText(/Overdue/)).toBeInTheDocument();
  });

  it("never marks a completed task overdue", async () => {
    stubApi([task({ status: "DONE", dueDate: "2020-01-02T00:00:00.000Z" })]);
    renderBoard();

    await screen.findByText("Task 1");
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  it("offers a retry when the board fails to load", async () => {
    stubApi([], { tasksFail: true });
    renderBoard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Board is down");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockedApiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/tasks`);
  });
});

describe("Board filtering and sorting", () => {
  function tasksFetchCount() {
    return mockedApiRequest.mock.calls.filter(
      (call) => call[0] === `/projects/${PROJECT_ID}/tasks`,
    ).length;
  }

  it("narrows the board by title without refetching", async () => {
    stubApi([task({ title: "Weave the basket" }), task({ title: "Carry the load" })]);
    renderBoard();
    await screen.findByText("Weave the basket");
    const before = tasksFetchCount();

    await userEvent.type(screen.getByLabelText("Search tasks by title"), "basket");

    expect(screen.queryByText("Carry the load")).not.toBeInTheDocument();
    expect(screen.getByText("Weave the basket")).toBeInTheDocument();
    expect(tasksFetchCount()).toBe(before);
  });

  it("filters by priority", async () => {
    stubApi([
      task({ title: "urgent one", priority: "URGENT" }),
      task({ title: "low one", priority: "LOW" }),
    ]);
    renderBoard();
    await screen.findByText("urgent one");

    await userEvent.selectOptions(screen.getByLabelText("Filter by priority"), "URGENT");

    expect(screen.getByText("urgent one")).toBeInTheDocument();
    expect(screen.queryByText("low one")).not.toBeInTheDocument();
  });

  it("filters to unassigned tasks", async () => {
    stubApi([
      task({ title: "mine", assigneeId: testUser.id }),
      task({ title: "nobody's", assigneeId: null }),
    ]);
    renderBoard();
    await screen.findByText("mine");

    await userEvent.selectOptions(screen.getByLabelText("Filter by assignee"), "UNASSIGNED");

    expect(screen.getByText("nobody's")).toBeInTheDocument();
    expect(screen.queryByText("mine")).not.toBeInTheDocument();
  });

  it("reorders a column when the sort changes", async () => {
    stubApi([
      task({ title: "banana", priority: "URGENT" }),
      task({ title: "apple", priority: "LOW" }),
    ]);
    renderBoard();
    await screen.findByText("banana");

    const headings = () =>
      within(column("Not started"))
        .getAllByRole("heading", { level: 4 })
        .map((node) => node.textContent);

    expect(headings()).toEqual(["banana", "apple"]);
    await userEvent.selectOptions(screen.getByLabelText("Sort tasks by"), "TITLE");
    expect(headings()).toEqual(["apple", "banana"]);
  });

  it("reports how much of the board is showing", async () => {
    stubApi([task({ title: "keep me" }), task({ title: "hide me" })]);
    renderBoard();
    await screen.findByText("keep me");

    await userEvent.type(screen.getByLabelText("Search tasks by title"), "keep");

    expect(screen.getByText("Showing 1 of 2 tasks")).toBeInTheDocument();
  });

  it("offers a way back when nothing matches", async () => {
    stubApi([task({ title: "Weave the basket" })]);
    renderBoard();
    await screen.findByText("Weave the basket");

    await userEvent.type(screen.getByLabelText("Search tasks by title"), "nothing matches this");
    expect(await screen.findByText("No matching tasks")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByText("Weave the basket")).toBeInTheDocument();
  });

  it("keeps the empty-board invitation distinct from an empty filter result", async () => {
    stubApi([]);
    renderBoard();

    expect(await screen.findByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByText("No matching tasks")).not.toBeInTheDocument();
  });
});

describe("Board loading state", () => {
  it("shows a skeleton board rather than a blank page", () => {
    // Never resolves: this is what the first paint looks like on a slow network.
    mockedApiRequest.mockImplementation(() => new Promise(() => {}));
    renderBoard();

    expect(screen.getByRole("status")).toHaveTextContent("Loading tasks…");
    // No misleading empty state while the real answer is still in flight.
    expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the toolbar usable while the board loads", () => {
    mockedApiRequest.mockImplementation(() => new Promise(() => {}));
    renderBoard();

    expect(screen.getByLabelText("Search tasks by title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New task/ })).toBeInTheDocument();
  });

  it("replaces the skeleton with the board once the tasks arrive", async () => {
    stubApi([task({ title: "Loaded task" })]);
    renderBoard();

    expect(await screen.findByText("Loaded task")).toBeInTheDocument();
    expect(screen.queryByText("Loading tasks…")).not.toBeInTheDocument();
  });
});

describe("Board assignee resolution", () => {
  it("stays quiet about the assignee until the member list settles", async () => {
    // /tasks routinely wins the race against /members. While the map is
    // undefined, "not a member" and "not loaded" are indistinguishable — and
    // guessing flashes a claim that is simply false.
    let releaseMembers = () => {};
    const membersArrived = new Promise<void>((resolve) => {
      releaseMembers = resolve;
    });

    mockedApiRequest.mockImplementation(async (path: string) => {
      if (path === `/projects/${PROJECT_ID}/members`) {
        await membersArrived;
        return membership as never;
      }
      if (path === `/projects/${PROJECT_ID}/tasks`) {
        return [task({ assigneeId: testUser.id })] as never;
      }
      return null as never;
    });

    renderBoard();
    await screen.findByText("Task 1");

    expect(
      screen.queryByRole("img", { name: /no longer a member/i }),
    ).not.toBeInTheDocument();

    releaseMembers();

    expect(
      await screen.findByRole("img", { name: `Assigned to ${testUser.username}` }),
    ).toBeInTheDocument();
  });
});

describe("Board drag affordance", () => {
  it("gives every card a labelled drag handle", async () => {
    stubApi([task({ title: "Weave the basket" }), task({ title: "Carry the load" })]);
    renderBoard();
    await screen.findByText("Weave the basket");

    // A handle rather than the whole card: the title is a stretched link over
    // every pixel and the footer holds a select, so both would fight a
    // whole-card drag. Being a real button also gives the keyboard sensor a
    // focus target.
    expect(screen.getByRole("button", { name: "Move Weave the basket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Carry the load" })).toBeInTheDocument();
  });

  it("keeps the card's own controls reachable alongside the handle", async () => {
    stubApi([task({ title: "Weave the basket" })]);
    renderBoard();
    await screen.findByText("Weave the basket");

    expect(screen.getByRole("button", { name: "Weave the basket" })).toBeEnabled();
    expect(screen.getByLabelText("Status for Weave the basket")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move Weave the basket" })).toBeEnabled();
  });
});
