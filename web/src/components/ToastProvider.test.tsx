import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

describe("ToastProvider auto-dismiss", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // fireEvent, not userEvent: userEvent's async wrapper and vitest's fake timers
  // deadlock waiting on each other. These assertions need no async at all.
  function showToastWithFakeTimers(name: string) {
    vi.useFakeTimers();
    renderTrigger();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name }));
    });
  }

  it("clears a success toast on its own", () => {
    showToastWithFakeTimers("Succeed");
    expect(screen.getByText("Task created")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Task created")).not.toBeInTheDocument();
  });

  it("leaves errors on screen longer than successes", () => {
    showToastWithFakeTimers("Fail");

    // Still there at the point a success would already have gone.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText("Something broke")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Something broke")).not.toBeInTheDocument();
  });
});

describe("ToastProvider top-layer promotion", () => {
  // jsdom implements neither showPopover nor :popover-open, so this whole path
  // is dead in the suite unless we stand the API up ourselves.
  function stubPopoverApi(showPopover: () => void) {
    const proto = HTMLDivElement.prototype as unknown as Record<string, unknown>;
    proto.showPopover = showPopover;
    proto.hidePopover = () => {};
    return () => {
      delete proto.showPopover;
      delete proto.hidePopover;
    };
  }

  function toastHost(): HTMLElement | null {
    return document.querySelector("[aria-live='polite']")?.parentElement ?? null;
  }

  it("promotes the host so toasts clear a modal dialog's backdrop", async () => {
    const showPopover = vi.fn();
    const restore = stubPopoverApi(showPopover);
    try {
      renderTrigger();
      await userEvent.click(screen.getByRole("button", { name: "Succeed" }));
      await screen.findByText("Task created");

      expect(showPopover).toHaveBeenCalled();
      expect(toastHost()).toHaveAttribute("popover", "manual");
    } finally {
      restore();
    }
  });

  it("falls back to a plain host rather than hiding every toast forever", async () => {
    // [popover] is display:none until shown. If promotion throws after the
    // attribute is set, keeping it would make toasts permanently invisible.
    const restore = stubPopoverApi(() => {
      throw new Error("popover refused");
    });
    try {
      renderTrigger();
      await userEvent.click(screen.getByRole("button", { name: "Succeed" }));

      expect(await screen.findByText("Task created")).toBeInTheDocument();
      expect(toastHost()).not.toHaveAttribute("popover");
    } finally {
      restore();
    }
  });
});
