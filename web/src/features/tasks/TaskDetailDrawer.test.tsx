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
  avatarUrl: null,
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
  updateGate?: Promise<void>;
  deleteGate?: Promise<void>;
  /** Skip seeding the member cache, to exercise the first-paint case. */
  coldCache?: boolean;
}

/**
 * Renders the drawer the way the board does: the members query is already
 * cached, because Board mounts it long before any card can be clicked.
 */
function setup(current: Task = task(), options: SetupOptions = {}) {
  const { myRole = "OWNER", updateError, updateGate, deleteError, deleteGate, coldCache } =
    options;

  mockedApiRequest.mockImplementation(async (path: string, requestOptions = {}) => {
    const method = requestOptions.method ?? "GET";
    if (path === `/projects/${PROJECT_ID}/members`) return roster(myRole) as never;
    if (method === "PATCH") {
      if (updateGate) await updateGate;
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

/** The only Cancel left is the delete confirmation's. */
function confirmCancelButton(): HTMLElement {
  return screen.getByRole("button", { name: "Cancel" });
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("TaskDetailDrawer editing", () => {
  it("opens on the task's current values with focus in the title", () => {
    setup();

    expect(screen.getByLabelText("Title")).toHaveValue("Draft the release notes");
    expect(screen.getByLabelText("Description")).toHaveValue("Cover the board changes");
    expect(screen.getByLabelText("Status")).toHaveValue("IN_PROGRESS");
    expect(screen.getByLabelText("Priority")).toHaveValue("HIGH");
    // The API's instant round-trips into the yyyy-mm-dd the date input wants.
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Assignee")).toHaveValue(grace.id);
    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("leaves the optional fields blank when the task has none set", () => {
    setup(task({ description: null, dueDate: null, assigneeId: null }));

    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Due date")).toHaveValue("");
    expect(screen.getByLabelText("Assignee")).toHaveValue("");
  });

  it("has no save or cancel button — edits are committed as they happen", () => {
    setup();

    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("saves a priority change the moment it is picked", async () => {
    setup();

    await userEvent.selectOptions(screen.getByLabelText("Priority"), "URGENT");

    await waitFor(() => expect(patchBodies()).toEqual([{ priority: "URGENT" }]));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("saves a status change on its own, without touching other fields", async () => {
    setup();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "DONE");

    await waitFor(() => expect(patchBodies()).toEqual([{ status: "DONE" }]));
  });

  it("commits the title on blur, and only the title", async () => {
    setup();

    const title = screen.getByLabelText("Title");
    await userEvent.clear(title);
    await userEvent.type(title, "Draft the launch notes");
    await userEvent.tab();

    await waitFor(() => expect(patchBodies()).toEqual([{ title: "Draft the launch notes" }]));
  });

  it("does not send a request when a field is blurred unchanged", async () => {
    setup();

    await userEvent.click(screen.getByLabelText("Title"));
    await userEvent.tab();

    expect(patchBodies()).toHaveLength(0);
  });

  it("applies the same title rules as create, without calling the API", async () => {
    setup();

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.tab();

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(patchBodies()).toHaveLength(0);
  });

  it("clears the optional fields with null rather than an empty string", async () => {
    setup();

    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "");
    await waitFor(() => expect(patchBodies()).toContainEqual({ assigneeId: null }));

    const description = screen.getByLabelText("Description");
    await userEvent.clear(description);
    await userEvent.tab();
    // UpdateTaskDto rejects "" for description (@MinLength(1)) but treats null
    // as a clear, so an emptied box must send null.
    await waitFor(() => expect(patchBodies()).toContainEqual({ description: null }));
  });

  it("keeps the chosen value on screen while the save is in flight", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    setup(task(), { updateGate: gate });

    await userEvent.selectOptions(screen.getByLabelText("Priority"), "LOW");

    // Not snapped back to HIGH for the duration of the request.
    expect(screen.getByLabelText("Priority")).toHaveValue("LOW");
    expect(await screen.findByText("Saving…")).toBeInTheDocument();

    release();
    await waitFor(() => expect(screen.getByLabelText("Priority")).toHaveValue("LOW"));
  });

  it("reverts the control and explains itself when a save is refused", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    setup(task(), { updateError: new ApiError(403, "You cannot edit this task") });

    await userEvent.selectOptions(screen.getByLabelText("Priority"), "LOW");

    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot edit this task");
    // Back to the server's value — the control must never show an unsaved state
    // as though it were saved.
    await waitFor(() => expect(screen.getByLabelText("Priority")).toHaveValue("HIGH"));
  });

  it("stays open after a failed save", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    const { onClose } = setup(task(), {
      updateError: new ApiError(404, "Task not found in this project"),
    });

    await userEvent.selectOptions(screen.getByLabelText("Status"), "DONE");

    await screen.findByRole("alert");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the description as Markdown in the preview", async () => {
    const markdown = ["## Notes", "", "See [the spec](https://example.com/spec)."].join("\n");
    setup(task({ description: markdown }));

    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "the spec" });
    expect(link).toHaveAttribute("href", "https://example.com/spec");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("commits the description when switching to Preview", async () => {
    setup();

    const description = screen.getByLabelText("Description");
    await userEvent.clear(description);
    await userEvent.type(description, "Rewritten in **bold**");
    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));

    // Previewing blurs the box without a blur the caller can rely on, so the
    // editor commits explicitly — otherwise the edit would be silently dropped.
    await waitFor(() =>
      expect(patchBodies()).toEqual([{ description: "Rewritten in **bold**" }]),
    );
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

describe("TaskDetailDrawer closing with uncommitted text", () => {
  it("flushes an edit that never got a blur", async () => {
    // Esc and the backdrop close the drawer without blurring the focused field.
    // In a form with a Save button that edit was simply abandoned; in an
    // autosave panel silently dropping it would be data loss.
    const { rerender } = setup();

    const description = screen.getByLabelText("Description");
    await userEvent.clear(description);
    await userEvent.type(description, "Half-written note");
    expect(patchBodies()).toHaveLength(0);

    // Unmount without blurring, the way closing the drawer does.
    rerender(<TaskDetailDrawer projectId={PROJECT_ID} task={null} onClose={() => {}} />);

    await waitFor(() =>
      expect(patchBodies()).toEqual([{ description: "Half-written note" }]),
    );
  });

  it("sends nothing when the text was already committed", async () => {
    const { rerender } = setup();

    const description = screen.getByLabelText("Description");
    await userEvent.clear(description);
    await userEvent.type(description, "Committed note");
    await userEvent.tab();
    await waitFor(() => expect(patchBodies()).toHaveLength(1));

    rerender(<TaskDetailDrawer projectId={PROJECT_ID} task={null} onClose={() => {}} />);

    // Still one: the flush compares against what was actually sent, not against
    // the task prop, which the refetch may not have updated yet.
    await waitFor(() => expect(patchBodies()).toHaveLength(1));
  });

  it("does not flush a title the server would reject", async () => {
    const { rerender } = setup();

    await userEvent.clear(screen.getByLabelText("Title"));
    rerender(<TaskDetailDrawer projectId={PROJECT_ID} task={null} onClose={() => {}} />);

    await waitFor(() => expect(patchBodies()).toHaveLength(0));
  });
});
