import { describe, expect, it } from "vitest";
import { queryClient } from "./queryClient";

/**
 * These defaults are behaviour, not decoration: they decide whether a board
 * refreshes when the user comes back to the tab, and whether a failed mutation
 * is quietly replayed. Pin them so a stray edit can't change it unnoticed.
 */
describe("queryClient defaults", () => {
  const defaults = queryClient.getDefaultOptions();

  it("refetches when the window regains focus", () => {
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
  });

  it("keeps data fresh for 30 seconds", () => {
    expect(defaults.queries?.staleTime).toBe(30_000);
  });

  it("retries a failed read once", () => {
    expect(defaults.queries?.retry).toBe(1);
  });

  it("never replays a failed mutation", () => {
    // A blind retry could create a second task or re-delete a member.
    expect(defaults.mutations?.retry).toBe(0);
  });
});
