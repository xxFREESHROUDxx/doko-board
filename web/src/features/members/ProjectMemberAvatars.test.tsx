import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ProjectMemberAvatars } from "./ProjectMemberAvatars";
import { renderWithProviders, testUser } from "../../test/utils";
import { apiRequest } from "../../lib/apiClient";
import type { ProjectMember, User } from "../../types/api";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

function member(index: number, username: string): ProjectMember {
  const user: User = {
    id: `user-${index}`,
    email: `user${index}@example.com`,
    username,
  };
  return { id: `pm-${index}`, role: "MEMBER", joinedAt: "2026-01-01T00:00:00.000Z", user };
}

const roster: ProjectMember[] = [
  { id: "pm-0", role: "OWNER", joinedAt: "2026-01-01T00:00:00.000Z", user: testUser },
  member(1, "Grace Hopper"),
  member(2, "Linus Pauling"),
  member(3, "Marie Curie"),
  member(4, "Alan Turing"),
];

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("ProjectMemberAvatars", () => {
  it("names the whole cluster for screen readers and collapses the overflow", async () => {
    mockedApiRequest.mockResolvedValue(roster as never);
    renderWithProviders(<ProjectMemberAvatars projectId={PROJECT_ID} />);

    const cluster = await screen.findByRole("img", { name: /^Project members:/ });
    expect(cluster).toHaveAccessibleName(
      "Project members: Ada Lovelace, Grace Hopper, Linus Pauling, Marie Curie, Alan Turing",
    );
    // Four avatars, then "+1" — the individual bubbles stay decorative.
    expect(cluster).toHaveTextContent("+1");
  });

  it("stays quiet while the members are loading", () => {
    mockedApiRequest.mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<ProjectMemberAvatars projectId={PROJECT_ID} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("stays quiet when the member list fails to load", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    mockedApiRequest.mockRejectedValue(new ApiError(500, "Boom"));
    renderWithProviders(<ProjectMemberAvatars projectId={PROJECT_ID} />);

    // A broken top-bar decoration must not shout at the user.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Boom")).not.toBeInTheDocument();
  });
});
