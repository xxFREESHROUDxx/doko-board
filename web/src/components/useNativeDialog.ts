import {
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
} from "react";

interface NativeDialogOptions {
  open: boolean;
  /** Fires on every close path (Esc, backdrop, close button). Must be idempotent. */
  onClose: () => void;
  /** While true the dialog refuses to close — e.g. a submit in flight. */
  busy: boolean;
}

/**
 * Drives a native <dialog> as a controlled modal: syncs the `open` prop with
 * showModal()/close(), reports self-closes (Esc) through onClose, and treats a
 * press-and-release on the ::backdrop as a dismissal.
 *
 * Shared by Modal and Drawer — both are the same machine in different clothes.
 */
export function useNativeDialog({ open, onClose, busy }: NativeDialogOptions) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
      // showModal() focuses the first focusable element (usually the X button);
      // redirect to the caller's chosen field. React's autoFocus can't work here
      // — the content mounts inside a closed <dialog>, so .focus() is a no-op.
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

  // Only treat a click as "backdrop" when the press also started there —
  // otherwise a text-selection drag out of an input would close (and reset) a form.
  const pressedOnBackdrop = useRef(false);

  return {
    dialogRef,
    /** Imperative close, for a header X or a Cancel button. */
    close: () => dialogRef.current?.close(),
    dialogProps: {
      ref: dialogRef,
      // Esc fires the native cancel event before close; block it while busy.
      onCancel: (event: SyntheticEvent<HTMLDialogElement>) => {
        if (busy) event.preventDefault();
      },
      onPointerDown: (event: PointerEvent<HTMLDialogElement>) => {
        pressedOnBackdrop.current = event.target === dialogRef.current;
      },
      // Clicks on the ::backdrop land on the dialog element itself.
      onClick: (event: MouseEvent<HTMLDialogElement>) => {
        if (busy) return;
        if (pressedOnBackdrop.current && event.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      },
    },
  };
}
