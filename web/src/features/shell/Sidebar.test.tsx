import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { renderWithProviders } from "../../test/utils";
import { apiRequest } from "../../lib/apiClient";
import type { Project } from "../../types/api";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

function project(id: string, name: string): Project {
  return {
    id,
    name,
    description: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const HARVEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MOBILE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function renderSidebar(projects: Project[], route = "/") {
  mockedApiRequest.mockResolvedValue(projects as never);
  return renderWithProviders(<Sidebar />, { route, path: route });
}

const boardLink = () => screen.getByRole("link", { name: "Board" });

/** The link renders before the projects query resolves, so poll the href. */
function expectBoardHref(href: string) {
  return waitFor(() => expect(boardLink()).toHaveAttribute("href", href));
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

describe("Sidebar board link", () => {
  it("is never a dead end — it points at your first project from the dashboard", async () => {
    // Regression: this used to be a fixed /projects link to a "coming soon"
    // placeholder, so from the dashboard it went nowhere useful.
    renderSidebar([project(HARVEST, "Harvest"), project(MOBILE, "Mobile")]);

    await expectBoardHref(`/projects/${HARVEST}`);
  });

  it("points at the project you are currently in", async () => {
    renderSidebar(
      [project(HARVEST, "Harvest"), project(MOBILE, "Mobile")],
      `/projects/${MOBILE}`,
    );

    await expectBoardHref(`/projects/${MOBILE}`);
    expect(boardLink()).toHaveAttribute("aria-current", "page");
  });

  it("remembers the last board after you navigate away", async () => {
    // The other half of the report: visiting another section used to lose the
    // project, sending you back to the placeholder.
    sessionStorage.setItem("dokoboard_last_project", MOBILE);
    renderSidebar([project(HARVEST, "Harvest"), project(MOBILE, "Mobile")], "/calendar");

    await expectBoardHref(`/projects/${MOBILE}`);
    expect(boardLink()).not.toHaveAttribute("aria-current");
  });

  it("ignores a remembered project that no longer exists", async () => {
    sessionStorage.setItem("dokoboard_last_project", "deleted-project-id");
    renderSidebar([project(HARVEST, "Harvest")]);

    await expectBoardHref(`/projects/${HARVEST}`);
  });

  it("falls back to the dashboard when there are no projects", async () => {
    renderSidebar([]);

    // Wait for the (empty) query to settle so this isn't just the initial state.
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalled());
    // The dashboard owns the "create your first project" prompt.
    await expectBoardHref("/");
  });

  it("no longer offers a Projects placeholder", async () => {
    renderSidebar([project(HARVEST, "Harvest")]);

    await expectBoardHref(`/projects/${HARVEST}`);
    expect(screen.queryByRole("link", { name: "Projects" })).not.toBeInTheDocument();
  });
});
