import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { XIcon } from "./icons";

interface ModalProps {
  open: boolean;
  /** Called whenever the dialog closes (Esc, backdrop, close button). Must be idempotent. */
  onClose: () => void;
  title: string;
  /** While true the dialog refuses to close (Esc, backdrop, X) — e.g. a submit in flight. */
  busy?: boolean;
  children: ReactNode;
}

export function Modal({ open, onClose, title, busy = false, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Keep the latest onClose in a ref so the close listener isn't re-attached
  // every render (callers pass inline handlers).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Sync the `open` prop with the native dialog's modal state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable element (the X button); redirect
      // to the caller's chosen field. React's autoFocus can't work here — the
      // dialog is mounted closed, so mount-time .focus() is a no-op.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // The dialog can close itself (Esc), so report it via the native close event.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  // Esc fires the native cancel event before close; block it while busy.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (busy) event.preventDefault();
  };

  // Only treat a click as "backdrop" when the press also started there —
  // otherwise a text-selection drag out of an input would close (and reset) the form.
  const pressedOnBackdrop = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLDialogElement>) => {
    pressedOnBackdrop.current = event.target === dialogRef.current;
  };

  // Clicks on the ::backdrop land on the dialog element itself.
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (busy) return;
    if (pressedOnBackdrop.current && event.target === dialogRef.current) {
      dialogRef.current?.close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-xl border border-stone-200 bg-white p-0 shadow-xl backdrop:bg-ink/40 motion-safe:transition-[opacity,scale] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:scale-95 motion-safe:starting:opacity-0"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          disabled={busy}
          aria-label="Close"
          className="-mr-2 -mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/70 hover:bg-stone-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 disabled:pointer-events-none disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-150"
        >
          <XIcon />
        </button>
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </dialog>
  );
}
