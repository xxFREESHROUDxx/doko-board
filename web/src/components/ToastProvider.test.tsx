import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./toastContext";

function Trigger() {
  const { showToast } = useToast();
  return (
    <>
      <button onClick={() => showToast("Task created")}>Succeed</button>
      <button onClick={() => showToast("Something broke", "error")}>Fail</button>
    </>
  );
}

function renderTrigger() {
  return render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
}

describe("ToastProvider", () => {
  it("shows a success message in the polite region", async () => {
    renderTrigger();
    await userEvent.click(screen.getByRole("button", { name: "Succeed" }));

    const toast = await screen.findByText("Task created");
    expect(toast.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });

  it("announces errors assertively", async () => {
    renderTrigger();
    await userEvent.click(screen.getByRole("button", { name: "Fail" }));

    const toast = await screen.findByText("Something broke");
    expect(toast.closest("[aria-live]")).toHaveAttribute("aria-live", "assertive");
  });

  it("dismisses a toast when the close button is used", async () => {
    renderTrigger();
    await userEvent.click(screen.getByRole("button", { name: "Succeed" }));
    await screen.findByText("Task created");

    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));

    expect(screen.queryByText("Task created")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts", async () => {
    renderTrigger();
    await userEvent.click(screen.getByRole("button", { name: "Succeed" }));
    await userEvent.click(screen.getByRole("button", { name: "Fail" }));

    expect(await screen.findByText("Task created")).toBeInTheDocument();
    expect(await screen.findByText("Something broke")).toBeInTheDocument();
  });

  it("throws when useToast is used outside the provider", () => {
    // React logs the thrown render error; silence it for this expected failure.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/must be used within/);
    spy.mockRestore();
  });
});
