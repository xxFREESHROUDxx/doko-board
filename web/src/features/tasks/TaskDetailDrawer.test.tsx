import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { createTestQueryClient, renderWithProviders, testUser } from "../../test/utils";
import { memberKeys } from "../members/api";
import { apiRequest } from "../../lib/apiClient";
import type { ProjectMember, ProjectRole, Task, User } from "../../types/api";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const grace: User = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "grace@example.com",
  username: "Grace Hopper",
};

/** Membership with the signed-in user holding `myRole`. */
function roster(myRole: ProjectRole): ProjectMember[] {
  return [
    { id: "pm-1", role: myRole, joinedAt: "2026-01-01T00:00:00.000Z", user: testUser },
    { id: "pm-2", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z", user: grace },
  ];
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Draft the release notes",
    description: "Cover the board changes",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: "2026-09-01T00:00:00.000Z",
    projectId: PROJECT_ID,
    assigneeId: grace.id,
    createdById: testUser.id,
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-06T00:00:00.000Z",
    ...overrides,
  };
}

interface SetupOptions {
  myRole?: ProjectRole;
  updateError?: unknown;
  deleteError?: unknown;
  /** Held open so the test can assert the in-flight UI. */
  deleteGate?: Promise<void>;
  /** Skip seeding the member cache, to exercise the first-paint case. */
  coldCache?: boolean;
}

/**
 * Renders the drawer the way the board does: the members query is already
 * cached, because Board mounts it long before any card can be clicked.
 */
function setup(current: Task = task(), options: SetupOptions = {}) {
  const { myRole = "OWNER", updateError, deleteError, deleteGate, coldCache } = options;

  mockedApiRequest.mockImplementation(async (path: string, requestOptions = {}) => {
    const method = requestOptions.method ?? "GET";
    if (path === `/projects/${PROJECT_ID}/members`) return roster(myRole) as never;
    if (method === "PATCH") {
      if (updateError) throw updateError;
      return { ...current, ...(requestOptions.body as Partial<Task>) } as never;
    }
    if (method === "DELETE") {
      if (deleteGate) await deleteGate;
      if (deleteError) throw deleteError;
      return null as never;
    }
    return null as never;
  });

  const queryClient = createTestQueryClient();
  if (!coldCache) queryClient.setQueryData(memberKeys.list(PROJECT_ID), roster(myRole));

  const onClose = vi.fn();
  const view = renderWithProviders(
    <TaskDetailDrawer projectId={PROJECT_ID} task={current} onClose={onClose} />,
    { queryClient },
  );
  return { ...view, onClose };
}

/** Bodies of the PATCH calls, in order. */
function patchBodies(): unknown[] {
  return mockedApiRequest.mock.calls
    .filter(([, options]) => options?.method === "PATCH")
    .map(([, options]) => options?.body);
}

function deleteCalls(): string[] {
  return mockedApiRequest.mock.calls
    .filter(([, options]) => options?.method === "DELETE")
    .map(([path]) => path);
}

const deleteButton = () => screen.queryByRole("button", { name: "Delete task" });

/** The form has a Cancel of its own above, so the confirmation's is the last. */
function confirmCancelButton(): HTMLElement {
  const buttons = screen.getAllByRole("button", { name: "Cancel" });
  return buttons[buttons.length - 1];
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("TaskDetailDrawer editing", () => {
  it("opens on the task's current values with focus in the title", () => {
    setup();

    expect(screen.getByLabelText("Title")).toHaveValue("Draft the release notes");
    expect(screen.getByLabelText("Description (optional)")).toHaveValue(
      "Cover the board changes",
    );
    expect(screen.getByLabelText("Status")).toHaveValue("IN_PROGRESS");
    expect(screen.getByLabelText("Priority")).toHaveValue("HIGH");
    // The API's instant round-trips into the yyyy-mm-dd the date input wants.
    expect(screen.getByLabelText("Due date (optional)")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Assignee")).toHaveValue(grace.id);
    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("leaves the optional fields blank when the task has none set", () => {
    setup(task({ description: null, dueDate: null, assigneeId: null }));

    expect(screen.getByLabelText("Description (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Due date (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Assignee")).toHaveValue("");
  });

  it("saves an edit, confirms it and closes", async () => {
    const { onClose } = setup();

    const title = screen.getByLabelText("Title");
    await userEvent.clear(title);
    await userEvent.type(title, "Draft the launch notes");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "IN_REVIEW");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Only the two edited fields: a full-object save would be a PUT, and would
    // revert any change someone else made since the drawer opened.
    await waitFor(() =>
      expect(patchBodies()).toEqual([
        { title: "Draft the launch notes", status: "IN_REVIEW" },
      ]),
    );
    expect(mockedApiRequest.mock.calls.find(([, o]) => o?.method === "PATCH")?.[0]).toBe(
      `/projects/${PROJECT_ID}/tasks/task-1`,
    );
    expect(await screen.findByText("Task updated")).toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("clears the optional fields with null rather than an empty string", async () => {
    setup();

    await userEvent.clear(screen.getByLabelText("Description (optional)"));
    await userEvent.clear(screen.getByLabelText("Due date (optional)"));
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(patchBodies()).toEqual([
        expect.objectContaining({ description: null, dueDate: null, assigneeId: null }),
      ]),
    );
  });

  it("applies the same title rules as create", async () => {
    setup();

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(patchBodies()).toHaveLength(0);
  });

  it("stays open and surfaces the server's message when the save fails", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    const { onClose } = setup(task(), {
      updateError: new ApiError(404, "Task not found in this project"),
    });

    // An untouched form sends nothing at all, so dirty a field to reach the API.
    await userEvent.type(screen.getByLabelText("Title"), " (revised)");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Task not found in this project",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("resets to the newly selected task when the drawer switches cards", () => {
    const { rerender } = setup();
    expect(screen.getByLabelText("Title")).toHaveValue("Draft the release notes");

    rerender(
      <TaskDetailDrawer
        projectId={PROJECT_ID}
        task={task({ id: "task-2", title: "Second task", priority: "LOW" })}
        onClose={() => {}}
      />,
    );

    expect(screen.getByLabelText("Title")).toHaveValue("Second task");
    expect(screen.getByLabelText("Priority")).toHaveValue("LOW");
  });

  it("renders nothing while closed", () => {
    renderWithProviders(
      <TaskDetailDrawer projectId={PROJECT_ID} task={null} onClose={() => {}} />,
    );

    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  // Regression: an uncontrolled select drops a value it has no <option> for, so
  // on a cold members cache the drawer showed "Unassigned" for an assigned task
  // while the form still held the real id — and saving re-asserted an assignment
  // the UI had denied. Fixed by driving the control from form state.
  it("shows the assignee once the member list arrives on a cold cache", async () => {
    setup(task(), { coldCache: true });

    const assignee = screen.getByLabelText("Assignee");
    await waitFor(() => expect(assignee.querySelectorAll("option")).toHaveLength(3));
    expect(assignee).toHaveValue(grace.id);
  });
});

describe("TaskDetailDrawer delete permissions", () => {
  // Mirrors TasksService.delete: owners and admins delete anything, everyone
  // else only what they created themselves.
  it("offers delete to an owner on someone else's task", () => {
    setup(task({ createdById: grace.id }), { myRole: "OWNER" });

    expect(deleteButton()).toBeInTheDocument();
  });

  it("offers delete to an admin on someone else's task", () => {
    setup(task({ createdById: grace.id }), { myRole: "ADMIN" });

    expect(deleteButton()).toBeInTheDocument();
  });

  it("offers delete to a member on their own task", () => {
    setup(task({ createdById: testUser.id }), { myRole: "MEMBER" });

    expect(deleteButton()).toBeInTheDocument();
  });

  it("withholds delete from a member on someone else's task", () => {
    setup(task({ createdById: grace.id }), { myRole: "MEMBER" });

    expect(deleteButton()).not.toBeInTheDocument();
  });

  it("withholds delete from a viewer on someone else's task", () => {
    setup(task({ createdById: grace.id }), { myRole: "VIEWER" });

    expect(deleteButton()).not.toBeInTheDocument();
  });

  it("withholds delete when the creator's account is gone", () => {
    setup(task({ createdById: null }), { myRole: "MEMBER" });

    expect(deleteButton()).not.toBeInTheDocument();
  });

  it("does not flash the control before the role is known", async () => {
    setup(task(), { myRole: "OWNER", coldCache: true });

    // First paint: the member list is still in flight, so the role is unknown.
    expect(deleteButton()).not.toBeInTheDocument();
    // It appears once the membership resolves.
    expect(await screen.findByRole("button", { name: "Delete task" })).toBeInTheDocument();
  });
});

describe("TaskDetailDrawer deleting", () => {
  it("requires a confirmation before deleting", async () => {
    const { onClose } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));
    expect(screen.getByText("Delete this task for everyone?")).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));

    await waitFor(() =>
      expect(deleteCalls()).toEqual([`/projects/${PROJECT_ID}/tasks/task-1`]),
    );
    expect(await screen.findByText("Task deleted")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it("backs out of the confirmation without deleting", async () => {
    setup();

    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await userEvent.click(confirmCancelButton());

    expect(screen.queryByText("Delete this task for everyone?")).not.toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);
    expect(deleteButton()).toBeInTheDocument();
  });

  it("explains a refused delete and returns to a safe state", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    const { onClose } = setup(task(), {
      deleteError: new ApiError(403, "You cannot delete this task"),
    });

    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot delete this task");
    expect(onClose).not.toHaveBeenCalled();
    // Back to the single, unarmed button — not still primed to fire.
    expect(screen.queryByText("Delete this task for everyone?")).not.toBeInTheDocument();
    expect(deleteButton()).toBeInTheDocument();
  });

  it("locks the confirmation while the delete is in flight", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    setup(task(), { deleteGate: gate });

    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));

    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(confirmCancelButton()).toBeDisabled();

    release();
    await waitFor(() => expect(deleteCalls()).toHaveLength(1));
  });
});
