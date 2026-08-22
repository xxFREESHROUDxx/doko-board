import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MembersDialog } from "./MembersDialog";
import { renderWithProviders, testUser } from "../../test/utils";
import { apiRequest } from "../../lib/apiClient";
import type { ProjectMember, ProjectRole, User } from "../../types/api";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

const PROJECT_ID = "22222222-2222-4222-8222-222222222222";

function member(user: User, role: ProjectRole): ProjectMember {
  return { id: `pm-${user.id}`, role, joinedAt: "2026-01-01T00:00:00.000Z", user };
}

const grace: User = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "grace@example.com",
  username: "Grace Hopper",
};

/** Members list with the signed-in user holding `myRole`. */
function roster(myRole: ProjectRole): ProjectMember[] {
  return [member(testUser, myRole), member(grace, "MEMBER")];
}

/** Routes the mocked client by path so tests only describe the data, not the plumbing. */
function stubApi(members: ProjectMember[], overrides: Record<string, unknown> = {}) {
  const state = [...members];
  mockedApiRequest.mockImplementation(async (path: string, options = {}) => {
    const key = `${options.method ?? "GET"} ${path}`;
    if (key in overrides) {
      const result = overrides[key];
      if (typeof result === "function") return result(state, options) as never;
      return result as never;
    }
    if (key === `GET /projects/${PROJECT_ID}/members`) return state as never;
    return null as never;
  });
  return state;
}

function renderDialog() {
  return renderWithProviders(
    <MembersDialog projectId={PROJECT_ID} open onClose={() => {}} />,
  );
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("MembersDialog", () => {
  it("lists every member with their role", async () => {
    stubApi(roster("OWNER"));
    renderDialog();

    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
    expect(screen.getByText(/\(you\)/)).toBeInTheDocument();
  });

  it("shows the owner's role as a fixed chip, not an editable control", async () => {
    stubApi(roster("OWNER"));
    renderDialog();

    await screen.findByText("Grace Hopper");
    // Grace (MEMBER) is editable; the owner row is not.
    expect(screen.getByLabelText("Role for Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByLabelText(`Role for ${testUser.username}`)).not.toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("hides every management control from a viewer", async () => {
    stubApi(roster("VIEWER"));
    renderDialog();

    await screen.findByText("Grace Hopper");
    expect(screen.queryByRole("button", { name: "Add member" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role for Grace Hopper")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove Grace Hopper/ }),
    ).not.toBeInTheDocument();
  });

  it("offers only ADMIN, MEMBER and VIEWER when adding", async () => {
    stubApi(roster("OWNER"));
    renderDialog();

    const roleSelect = await screen.findByLabelText("Role");
    const options = within(roleSelect).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Admin", "Member", "Viewer"]);
  });

  it("adds a member and confirms with a toast", async () => {
    const ada = { ...grace, id: "44444444-4444-4444-8444-444444444444", email: "ada@new.com", username: "Ada N" };
    const state = stubApi(roster("OWNER"), {
      [`POST /projects/${PROJECT_ID}/members`]: (current: ProjectMember[]) => {
        current.push(member(ada, "ADMIN"));
        return null;
      },
    });
    renderDialog();
    await screen.findByText("Grace Hopper");

    await userEvent.type(screen.getByLabelText("Email"), ada.email);
    await userEvent.selectOptions(screen.getByLabelText("Role"), "ADMIN");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(await screen.findByText("Ada N added as admin")).toBeInTheDocument();
    expect(state).toHaveLength(3);
  });

  it("reports that nothing changed when the email matches no account", async () => {
    // The API answers 201 without adding anyone, so the UI must detect the no-op.
    stubApi(roster("OWNER"), { [`POST /projects/${PROJECT_ID}/members`]: null });
    renderDialog();
    await screen.findByText("Grace Hopper");

    await userEvent.type(screen.getByLabelText("Email"), "ghost@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't add anyone with that address/i,
    );
  });

  it("does not claim nobody was added when the re-read fails", async () => {
    // A swallowed refetch error would be indistinguishable from "no such user",
    // and would tell an admin the wrong thing about who can reach the project.
    const { ApiError } = await import("../../lib/apiClient");
    let listCalls = 0;
    stubApi(roster("OWNER"), {
      [`POST /projects/${PROJECT_ID}/members`]: null,
      [`GET /projects/${PROJECT_ID}/members`]: (current: ProjectMember[]) => {
        listCalls += 1;
        if (listCalls > 1) throw new ApiError(503, "Service unavailable");
        return current;
      },
    });
    renderDialog();
    await screen.findByText("Grace Hopper");

    await userEvent.type(screen.getByLabelText("Email"), "someone@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Add member" }));

    // The same failed read also flips the list into its own error state, so
    // assert on the message rather than on "the" alert.
    expect(
      await screen.findByText(/couldn't refresh the member list/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/couldn't add anyone/i)).not.toBeInTheDocument();
  });

  it("changes a member's role and refreshes the list", async () => {
    const state = stubApi(roster("OWNER"), {
      [`PATCH /projects/${PROJECT_ID}/members/${grace.id}`]: (current: ProjectMember[]) => {
        const row = current.find((m) => m.user.id === grace.id);
        if (row) row.role = "VIEWER";
        return null;
      },
    });
    renderDialog();

    const roleSelect = await screen.findByLabelText("Role for Grace Hopper");
    await userEvent.selectOptions(roleSelect, "VIEWER");

    expect(await screen.findByText("Grace Hopper is now viewer")).toBeInTheDocument();
    expect(state.find((m) => m.user.id === grace.id)?.role).toBe("VIEWER");
  });

  it("requires a confirmation before removing a member", async () => {
    const state = stubApi(roster("OWNER"), {
      [`DELETE /projects/${PROJECT_ID}/members/${grace.id}`]: (current: ProjectMember[]) => {
        const index = current.findIndex((m) => m.user.id === grace.id);
        if (index >= 0) current.splice(index, 1);
        return null;
      },
    });
    renderDialog();

    await userEvent.click(
      await screen.findByRole("button", { name: /Remove Grace Hopper/ }),
    );
    // The destructive call only fires after the second, explicit click.
    expect(state).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(state).toHaveLength(1));
    expect(await screen.findByText("Grace Hopper removed from the project")).toBeInTheDocument();
  });

  it("surfaces a server refusal as an error toast", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    stubApi(roster("ADMIN"), {
      [`DELETE /projects/${PROJECT_ID}/members/${grace.id}`]: () => {
        throw new ApiError(403, "Admins cannot remove other admins");
      },
    });
    renderDialog();

    await userEvent.click(
      await screen.findByRole("button", { name: /Remove Grace Hopper/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Admins cannot remove other admins")).toBeInTheDocument();
  });
});

describe("MembersDialog remove confirmation focus", () => {
  // Confirming swaps the focused trash button for a pair of buttons, which
  // unmounts the active element. Without a deliberate move, focus falls to
  // <body> and a keyboard user is dumped out of the dialog mid-action.
  it("moves focus onto Cancel when the confirmation opens", async () => {
    stubApi(roster("OWNER"));
    renderDialog();

    await userEvent.click(
      await screen.findByRole("button", { name: /Remove Grace Hopper/ }),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus(),
    );
    // Focus lands on the safe choice, not the destructive one.
    expect(screen.getByRole("button", { name: "Remove" })).not.toHaveFocus();
  });

  it("hands focus back to the remove button when the confirmation is dismissed", async () => {
    stubApi(roster("OWNER"));
    renderDialog();

    const remove = await screen.findByRole("button", { name: /Remove Grace Hopper/ });
    await userEvent.click(remove);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Remove Grace Hopper/ })).toHaveFocus(),
    );
  });

  it("returns focus to the remove button after a refused removal", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    stubApi(roster("ADMIN"), {
      [`DELETE /projects/${PROJECT_ID}/members/${grace.id}`]: () => {
        throw new ApiError(403, "Admins cannot remove other admins");
      },
    });
    renderDialog();

    await userEvent.click(
      await screen.findByRole("button", { name: /Remove Grace Hopper/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    // The confirmation collapses on failure, so focus must come back with it.
    expect(await screen.findByText("Admins cannot remove other admins")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Remove Grace Hopper/ })).toHaveFocus(),
    );
  });

  it("announces the confirmation in a live region", async () => {
    stubApi(roster("OWNER"));
    renderDialog();

    await userEvent.click(
      await screen.findByRole("button", { name: /Remove Grace Hopper/ }),
    );

    const status = screen.getByRole("status");
    expect(within(status).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(within(status).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("confirms one row at a time", async () => {
    const linus: User = {
      id: "44444444-4444-4444-8444-444444444444",
      email: "linus@example.com",
      username: "Linus Pauling",
    };
    stubApi([member(testUser, "OWNER"), member(grace, "MEMBER"), member(linus, "VIEWER")]);
    renderDialog();

    await userEvent.click(
      await screen.findByRole("button", { name: /Remove Grace Hopper/ }),
    );
    // The other rows keep their plain trash button.
    expect(screen.getByRole("button", { name: /Remove Linus Pauling/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
  });
});
