import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { NotFoundPage } from "./NotFoundPage";
import { renderWithProviders } from "../../test/utils";

describe("NotFoundPage", () => {
  it("explains the dead link instead of silently redirecting", () => {
    renderWithProviders(<NotFoundPage />, { route: "/nope" });

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText(/may have been moved or deleted/i)).toBeInTheDocument();
  });

  it("offers a way back to the dashboard", () => {
    renderWithProviders(<NotFoundPage />, { route: "/nope" });

    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
