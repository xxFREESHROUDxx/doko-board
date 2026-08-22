import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";
import { createTestQueryClient, renderWithProviders, testUser } from "../../test/utils";
import { memberKeys } from "../members/api";
import { apiRequest } from "../../lib/apiClient";
import type { Project, ProjectMember, ProjectRole } from "../../types/api";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const project: Project = {
  id: PROJECT_ID,
  name: "Harvest Festival Site",
  description: "Ticketing and marketing.",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function roster(myRole: ProjectRole): ProjectMember[] {
  return [{ id: "pm-1", role: myRole, joinedAt: "2026-01-01T00:00:00.000Z", user: testUser }];
}

function setup(myRole: ProjectRole = "OWNER", options: { deleteError?: unknown } = {}) {
  mockedApiRequest.mockImplementation(async (path: string, requestOptions = {}) => {
    const method = requestOptions.method ?? "GET";
    if (path === `/projects/${PROJECT_ID}/members`) return roster(myRole) as never;
    if (path === `/projects/${PROJECT_ID}/tasks`) return [] as never;
    if (method === "DELETE" && options.deleteError) throw options.deleteError;
    if (method === "PATCH") return { ...project, ...(requestOptions.body as object) } as never;
    return null as never;
  });

  const queryClient = createTestQueryClient();
  queryClient.setQueryData(memberKeys.list(PROJECT_ID), roster(myRole));

  const onClose = vi.fn();
  return {
    onClose,
    ...renderWithProviders(
      <ProjectSettingsDialog project={project} open onClose={onClose} />,
      { queryClient },
    ),
  };
}

function callsOfMethod(method: string): string[] {
  return mockedApiRequest.mock.calls
    .filter(([, options]) => options?.method === method)
    .map(([path]) => path);
}

const deleteSection = () => screen.queryByRole("heading", { name: "Delete this project" });

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("ProjectSettingsDialog permissions", () => {
  // Mirrors assertOwner: only the owner may delete. Admins can still rename.
  it("offers deletion to the owner", () => {
    setup("OWNER");
    expect(deleteSection()).toBeInTheDocument();
  });

  it("hides deletion from an admin, who can still rename", () => {
    setup("ADMIN");
    expect(deleteSection()).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("gives a member neither", () => {
    setup("MEMBER");
    expect(deleteSection()).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByText(/Only an owner or admin/i)).toBeInTheDocument();
  });
});

describe("ProjectSettingsDialog renaming", () => {
  it("saves a new name and closes", async () => {
    const { onClose } = setup("OWNER");

    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Harvest 2027");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(callsOfMethod("PATCH")).toEqual([`/projects/${PROJECT_ID}`]));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("clears the description with null rather than an empty string", async () => {
    setup("OWNER");

    await userEvent.clear(screen.getByLabelText("Description (optional)"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const body = mockedApiRequest.mock.calls.find(([, o]) => o?.method === "PATCH")?.[1]?.body;
      expect(body).toMatchObject({ description: null });
    });
  });

  it("keeps Save disabled until something actually changes", async () => {
    setup("OWNER");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Name"), "!");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
});

describe("ProjectSettingsDialog deleting", () => {
  it("requires the project name to be typed before it will delete", async () => {
    setup("OWNER");

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    const confirm = screen.getByRole("button", { name: "Delete project" });

    // Deleting cascades to every task, so one stray click must not be enough.
    expect(confirm).toBeDisabled();
    expect(callsOfMethod("DELETE")).toHaveLength(0);

    await userEvent.type(screen.getByLabelText(/Type .* to confirm/), "wrong name");
    expect(confirm).toBeDisabled();
  });

  it("deletes once the name matches", async () => {
    setup("OWNER");

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    await userEvent.type(screen.getByLabelText(/Type .* to confirm/), project.name);
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));

    await waitFor(() => expect(callsOfMethod("DELETE")).toEqual([`/projects/${PROJECT_ID}`]));
  });

  it("surfaces a server refusal instead of pretending it worked", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    setup("OWNER", { deleteError: new ApiError(403, "Only the owner can delete this project.") });

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    await userEvent.type(screen.getByLabelText(/Type .* to confirm/), project.name);
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the owner can delete this project.",
    );
  });
});
