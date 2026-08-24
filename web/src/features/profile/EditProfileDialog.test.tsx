import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditProfileDialog } from "./EditProfileDialog";
import { renderWithProviders, testUser } from "../../test/utils";
import { apiRequest } from "../../lib/apiClient";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

const AVATAR = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

function setup(options: { user?: typeof testUser; error?: unknown } = {}) {
  const user = options.user ?? testUser;

  mockedApiRequest.mockImplementation(async (_path: string, requestOptions = {}) => {
    if (options.error) throw options.error;
    return { ...user, ...(requestOptions.body as object) } as never;
  });

  const onClose = vi.fn();
  return {
    onClose,
    ...renderWithProviders(<EditProfileDialog open onClose={onClose} />, { user }),
  };
}

/** Body of the PATCH to /users/me, if one was sent. */
function patchBody(): Record<string, unknown> | undefined {
  const call = mockedApiRequest.mock.calls.find(([, o]) => o?.method === "PATCH");
  return call?.[1]?.body as Record<string, unknown> | undefined;
}

beforeEach(() => {
  mockedApiRequest.mockReset();
});

describe("EditProfileDialog", () => {
  it("opens on the signed-in user's details", () => {
    setup();

    expect(screen.getByLabelText("Username")).toHaveValue(testUser.username);
    expect(screen.getByLabelText("Email")).toHaveValue(testUser.email);
  });

  it("keeps Save disabled until something changes", async () => {
    setup();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Username"), "_x");
    expect(screen.getByRole("button", { name: "Save profile" })).toBeEnabled();
  });

  it("sends only the fields that changed", async () => {
    setup();

    const username = screen.getByLabelText("Username");
    await userEvent.clear(username);
    await userEvent.type(username, "ada_l");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    // Email untouched, so it must not be in the body — the API treats an absent
    // key as "leave it alone".
    await waitFor(() => expect(patchBody()).toEqual({ username: "ada_l" }));
  });

  it("mirrors the API's username rules before sending anything", async () => {
    setup();

    const username = screen.getByLabelText("Username");
    await userEvent.clear(username);
    await userEvent.type(username, "not valid!");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(
      await screen.findByText("Letters, numbers and underscores only"),
    ).toBeInTheDocument();
    expect(patchBody()).toBeUndefined();
  });

  it("rejects an invalid email without calling the API", async () => {
    setup();

    const email = screen.getByLabelText("Email");
    await userEvent.clear(email);
    await userEvent.type(email, "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(patchBody()).toBeUndefined();
  });

  it("offers removal only when there is a picture, and sends null for it", async () => {
    setup({ user: { ...testUser, avatarUrl: AVATAR } });

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    // Gone from the preview, and the upload button changes back.
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(patchBody()).toEqual({ avatarUrl: null }));
  });

  it("has no Remove button when the user has no picture", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload picture" })).toBeInTheDocument();
  });

  it("surfaces a server refusal, such as a taken username", async () => {
    const { ApiError } = await import("../../lib/apiClient");
    const { onClose } = setup({
      error: new ApiError(409, "That username is already taken."),
    });

    await userEvent.type(screen.getByLabelText("Username"), "_x");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That username is already taken.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
