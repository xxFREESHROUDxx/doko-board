import { useId, type ReactNode } from "react";
import { useNativeDialog } from "./useNativeDialog";
import { XIcon } from "./icons";

interface DrawerProps {
  open: boolean;
  /** Called whenever the drawer closes (Esc, backdrop, close button). Idempotent. */
  onClose: () => void;
  title: string;
  busy?: boolean;
  /** "lg" suits a full detail panel; "md" a narrow side sheet. */
  size?: "md" | "lg";
  /** Rendered next to the title — a save indicator, a status chip. */
  headerAside?: ReactNode;
  children: ReactNode;
}

const SIZES = {
  md: "w-[28rem]",
  lg: "w-[40rem]",
} as const;

/** A right-hand sheet for detail views — the same native <dialog> machinery as Modal. */
export function Drawer({
  open,
  onClose,
  title,
  busy = false,
  size = "md",
  headerAside,
  children,
}: DrawerProps) {
  const { close, dialogProps } = useNativeDialog({ open, onClose, busy });
  const titleId = useId();

  return (
    <dialog
      {...dialogProps}
      aria-labelledby={titleId}
      className={`ml-auto mr-0 my-0 h-dvh max-h-none ${SIZES[size]} max-w-[calc(100vw-2rem)] flex-col border-l border-stone-200 bg-white p-0 shadow-xl backdrop:bg-ink/40 open:flex motion-safe:transition-[translate] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:translate-x-full`}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-200 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
            {title}
          </h2>
          {headerAside}
        </div>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close"
          className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink/70 hover:bg-stone-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 disabled:pointer-events-none disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-150"
        >
          <XIcon />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
