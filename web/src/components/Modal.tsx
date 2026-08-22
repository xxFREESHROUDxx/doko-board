import { useId, type ReactNode } from "react";
import { useNativeDialog } from "./useNativeDialog";
import { XIcon } from "./icons";

interface ModalProps {
  open: boolean;
  /** Called whenever the dialog closes (Esc, backdrop, close button). Must be idempotent. */
  onClose: () => void;
  title: string;
  /** While true the dialog refuses to close (Esc, backdrop, X) — e.g. a submit in flight. */
  busy?: boolean;
  /** "lg" suits list-shaped content (members, task detail); "md" suits short forms. */
  size?: "md" | "lg";
  children: ReactNode;
}

const SIZES = {
  md: "max-w-md",
  lg: "max-w-xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  busy = false,
  size = "md",
  children,
}: ModalProps) {
  const { close, dialogProps } = useNativeDialog({ open, onClose, busy });
  const titleId = useId();

  return (
    <dialog
      {...dialogProps}
      aria-labelledby={titleId}
      className={`m-auto w-[calc(100vw-2rem)] ${SIZES[size]} rounded-xl border border-stone-200 bg-white p-0 shadow-xl backdrop:bg-ink/40 motion-safe:transition-[opacity,scale] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:scale-95 motion-safe:starting:opacity-0`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
          {title}
        </h2>
        <button
          type="button"
          onClick={close}
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
