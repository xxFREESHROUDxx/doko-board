import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangleIcon, CheckIcon, XIcon } from "./icons";
import { ToastContext, type ToastContextValue, type ToastTone } from "./toastContext";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

// Errors carry detail worth reading; successes are just confirmation.
const DISMISS_MS: Record<ToastTone, number> = {
  success: 4000,
  error: 8000,
};

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-emerald-600/25 bg-white text-ink",
  error: "border-red-200 bg-white text-ink",
};

const ICON_STYLES: Record<ToastTone, string> = {
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DISMISS_MS[tone]),
      );
    },
    [dismiss],
  );

  // Unmount can strand pending timers; they'd fire into a dead setState.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  /**
   * A modal <dialog> is promoted to the top layer, and its ::backdrop paints over
   * every normal-flow element whatever the z-index — so a plain fixed host would
   * sit *behind* any open dialog, and (being outside the dialog) would be inert,
   * so the live regions would not be announced either. Promoting the host to the
   * top layer as a popover fixes both. Re-promoting on every change keeps it
   * above dialogs that opened since the last toast: the top layer is ordered by
   * promotion, not by z-index.
   */
  useEffect(() => {
    const host = hostRef.current;
    // No popover API: leave the attribute off entirely. The UA stylesheet hides
    // [popover] until it is shown, so setting it without being able to call
    // showPopover() would hide every toast permanently. Without it the host
    // still renders normally, which is correct whenever no dialog is open.
    if (!host || typeof host.showPopover !== "function") return;
    if (!host.hasAttribute("popover")) host.setAttribute("popover", "manual");
    // Re-promoting blurs anything focused inside the host, so don't yank a
    // Dismiss button out from under someone just because another toast landed.
    const holdsFocus = host.contains(document.activeElement);

    try {
      if (!holdsFocus && host.matches(":popover-open")) host.hidePopover();
      if (toasts.length > 0 && !host.matches(":popover-open")) host.showPopover();
    } catch {
      // The attribute is already set by this point, and [popover] is display:none
      // until shown — so failing here would hide every toast permanently. Drop
      // back to a plain fixed host, which is visible and correct with no dialog.
      host.removeAttribute("popover");
    }
  }, [toasts]);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Both regions stay mounted: a live region inserted at the same time as its
          content is not reliably announced. Errors interrupt, successes wait. */}
      {/* The explicit resets neutralise the UA popover styles (inset, margin,
          width, border, padding, background) that would otherwise centre this. */}
      <div
        ref={hostRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 top-auto z-50 m-0 flex h-auto w-full max-w-none flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-4 sm:items-end"
      >
        <ToastRegion
          politeness="polite"
          toasts={toasts.filter((toast) => toast.tone === "success")}
          onDismiss={dismiss}
        />
        <ToastRegion
          politeness="assertive"
          toasts={toasts.filter((toast) => toast.tone === "error")}
          onDismiss={dismiss}
        />
      </div>
    </ToastContext.Provider>
  );
}

interface ToastRegionProps {
  politeness: "polite" | "assertive";
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

function ToastRegion({ politeness, toasts, onDismiss }: ToastRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic="false"
      className="flex w-full flex-col items-center gap-2 sm:items-end"
    >
      {toasts.map((toast) => {
        const Icon = toast.tone === "success" ? CheckIcon : AlertTriangleIcon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-md motion-safe:transition-[opacity,translate] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0 ${TONE_STYLES[toast.tone]}`}
          >
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ICON_STYLES[toast.tone]}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 break-words pt-0.5 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-mr-1.5 -mt-1.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink/50 hover:bg-stone-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-colors motion-safe:duration-150"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
