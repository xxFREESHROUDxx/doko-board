import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectBoardPage } from "./ProjectBoardPage";
import { renderWithProviders, testUser } from "../../test/utils";
import { apiRequest } from "../../lib/apiClient";
import type { Project, ProjectMember } from "../../types/api";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const project: Project = {
  id: PROJECT_ID,
  name: "Harvest",
  description: "Bring the crop in",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const membership: ProjectMember[] = [
  { id: "pm-1", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z", user: testUser },
];

function stubApi(options: { projectStatus?: number } = {}) {
  mockedApiRequest.mockImplementation(async (path: string) => {
    if (path === `/projects/${PROJECT_ID}`) {
      if (options.projectStatus) {
        const { ApiError } = await import("../../lib/apiClient");
        throw new ApiError(options.projectStatus, "Project not found!");
      }
      return project as never;
    }
    if (path === `/projects/${PROJECT_ID}/members`) return membership as never;
    if (path === `/projects/${PROJECT_ID}/tasks`) return [] as never;
    return null as never;
  });
}

function renderPage() {
  return renderWithProviders(<ProjectBoardPage />, {
    route: `/projects/${PROJECT_ID}`,
    path: "/projects/:projectId",
  });
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("ProjectBoardPage", () => {
  it("renders the project and its board", async () => {
    stubApi();
    renderPage();

    expect(await screen.findByRole("heading", { name: "Harvest" })).toBeInTheDocument();
    expect(screen.getByText("Bring the crop in")).toBeInTheDocument();
    expect(await screen.findByText("No tasks yet")).toBeInTheDocument();
  });

  it("explains a missing project instead of showing a broken board", async () => {
    stubApi({ projectStatus: 404 });
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/doesn't exist or you don't have access/i);
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/");
  });

  it("treats a malformed id the same as a missing project", async () => {
    // The API answers 400 "Validation failed (uuid is expected)" for a bad id,
    // which to the user means exactly the same thing as not found.
    stubApi({ projectStatus: 400 });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /doesn't exist or you don't have access/i,
    );
  });

  it("opens the members dialog from the header", async () => {
    stubApi();
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Members/ }));

    expect(await screen.findByRole("heading", { name: "Members" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("does not mount the members dialog until it is asked for", async () => {
    stubApi();
    renderPage();

    await screen.findByRole("heading", { name: "Harvest" });
    // Kept unmounted so a half-typed email never survives a close and reopen.
    expect(screen.queryByRole("heading", { name: "Members" })).not.toBeInTheDocument();
  });
});
