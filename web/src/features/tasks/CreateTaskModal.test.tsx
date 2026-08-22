import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTaskModal } from "./CreateTaskModal";
import { renderWithProviders, testUser } from "../../test/utils";
import { apiRequest } from "../../lib/apiClient";
import type { ProjectMember, Task, TaskStatus, User } from "../../types/api";

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

const membership: ProjectMember[] = [
  { id: "pm-1", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z", user: testUser },
  { id: "pm-2", role: "MEMBER", joinedAt: "2026-01-02T00:00:00.000Z", user: grace },
];

interface StubOptions {
  /** Thrown from the POST instead of creating, to exercise the error path. */
  createError?: unknown;
}

/** Echoes the posted body back as a Task, the way the API does. */
function stubApi({ createError }: StubOptions = {}) {
  mockedApiRequest.mockImplementation(async (path: string, options = {}) => {
    const key = `${options.method ?? "GET"} ${path}`;
    if (key === `GET /projects/${PROJECT_ID}/members`) return membership as never;
    if (key === `POST /projects/${PROJECT_ID}/tasks`) {
      if (createError) throw createError;
      const body = options.body as Partial<Task>;
      return {
        id: "task-new",
        projectId: PROJECT_ID,
        createdById: testUser.id,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
        ...body,
      } as never;
    }
    return null as never;
  });
}

function renderModal(initialStatus: TaskStatus = "TODO") {
  const onClose = vi.fn();
  const view = renderWithProviders(
    <CreateTaskModal
      projectId={PROJECT_ID}
      open
      onClose={onClose}
      initialStatus={initialStatus}
    />,
  );
  return { ...view, onClose };
}

/** Posted request bodies, in order. */
function createdBodies(): unknown[] {
  return mockedApiRequest.mock.calls
    .filter(([path, options]) => path.endsWith("/tasks") && options?.method === "POST")
    .map(([, options]) => options?.body);
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("CreateTaskModal", () => {
  it("opens on the column it was launched from, with focus in the title field", async () => {
    stubApi();
    renderModal("IN_REVIEW");

    expect(screen.getByRole("heading", { name: "Create task" })).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("IN_REVIEW");
    // The dialog must hand focus to the first field, not leave it on the X button.
    expect(screen.getByLabelText("Title")).toHaveFocus();
  });

  it("labels every control", async () => {
    stubApi();
    renderModal();

    for (const label of [
      "Title",
      "Description (optional)",
      "Status",
      "Priority",
      "Due date (optional)",
      "Assignee",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("refuses an empty title and never reaches the API", async () => {
    stubApi();
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(createdBodies()).toHaveLength(0);
  });

  it("treats a whitespace-only title as empty", async () => {
    stubApi();
    renderModal();

    await userEvent.type(screen.getByLabelText("Title"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(createdBodies()).toHaveLength(0);
  });

  it("accepts a 100-character title — the backend's MaxLength boundary", async () => {
    stubApi();
    renderModal();

    await userEvent.type(screen.getByLabelText("Title"), "a".repeat(100));
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(createdBodies()).toHaveLength(1));
  });

  it("rejects a 101-character title", async () => {
    stubApi();
    renderModal();

    await userEvent.type(screen.getByLabelText("Title"), "a".repeat(101));
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(
      await screen.findByText("Title must be at most 100 characters"),
    ).toBeInTheDocument();
    expect(createdBodies()).toHaveLength(0);
  });

  it("sends null for the optional fields left blank", async () => {
    stubApi();
    renderModal("IN_PROGRESS");

    await userEvent.type(screen.getByLabelText("Title"), "Wire up the API");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    // Never "" — UpdateTaskDto rejects an empty description, and the API reads
    // null as "leave this unset".
    await waitFor(() =>
      expect(createdBodies()).toEqual([
        {
          title: "Wire up the API",
          description: null,
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          dueDate: null,
          assigneeId: null,
        },
      ]),
    );
  });

  it("sends every field the user filled in", async () => {
    stubApi();
    renderModal();

    await userEvent.type(screen.getByLabelText("Title"), "Ship the board");
    await userEvent.type(screen.getByLabelText("Description (optional)"), "With counts");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "HIGH");
    // jsdom sanitises a date input's value on every keystroke, so a partial
    // "2026-0…" would never stick — set the whole value at once.
    fireEvent.change(screen.getByLabelText("Due date (optional)"), {
      target: { value: "2026-09-01" },
    });
    await userEvent.selectOptions(await screen.findByLabelText("Assignee"), grace.id);

    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() =>
      expect(createdBodies()).toEqual([
        {
          title: "Ship the board",
          description: "With counts",
          status: "TODO",
          priority: "HIGH",
          // Pinned to UTC midnight so the day can't drift by timezone.
          dueDate: "2026-09-01T00:00:00.000Z",
          assigneeId: grace.id,
        },
      ]),
    );
  });

  it("offers only project members as assignees", async () => {
    stubApi();
    renderModal();

    const assignee = await screen.findByLabelText("Assignee");
    await waitFor(() =>
      expect(
        Array.from(assignee.querySelectorAll("option")).map((option) => option.textContent),
      ).toEqual(["Unassigned", testUser.username, grace.username]),
    );
  });

  it("confirms with a toast naming the destination and closes", async () => {
    stubApi();
    const { onClose } = renderModal("IN_REVIEW");

    await userEvent.type(screen.getByLabelText("Title"), "Review the copy");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByText("Task created in on review")).toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("keeps the form open and shows the server's message when the API refuses", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    stubApi({ createError: new ApiError(400, "Title must be greater than 1 character.") });
    const { onClose } = renderModal();

    await userEvent.type(screen.getByLabelText("Title"), "Ship it");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Title must be greater than 1 character.");
    expect(onClose).not.toHaveBeenCalled();
    // The user's work survives the failure.
    expect(screen.getByLabelText("Title")).toHaveValue("Ship it");
  });

  it("falls back to a readable message when the failure isn't an ApiError", async () => {
    stubApi({ createError: new TypeError("Failed to fetch") });
    renderModal();

    await userEvent.type(screen.getByLabelText("Title"), "Ship it");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("submits from the keyboard alone", async () => {
    stubApi();
    renderModal();

    // Focus starts in the title field, so typing and Enter is the whole flow.
    await userEvent.keyboard("Keyboard task{Enter}");

    await waitFor(() => expect(createdBodies()).toHaveLength(1));
    expect(createdBodies()[0]).toMatchObject({ title: "Keyboard task" });
  });

  it("does not mount the form until it is opened", () => {
    stubApi();
    renderWithProviders(
      <CreateTaskModal
        projectId={PROJECT_ID}
        open={false}
        onClose={() => {}}
        initialStatus="TODO"
      />,
    );

    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });
});
