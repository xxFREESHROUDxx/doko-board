import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "./icons";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  error?: string;
  /** Hides the label visually but keeps it for screen readers (toolbars, inline filters). */
  hideLabel?: boolean;
}

// Note for callers: `className` is appended, but that does not win the cascade —
// emitted CSS order does. Padding utilities here (py-2.5/pl-3.5/pr-10) are sorted
// after the smaller ones Tailwind emits, so a compact override is dead code. The
// full-height control is deliberate anyway: it keeps the 40px hit-target floor.

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, hideLabel = false, className, children, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "text-sm font-medium text-ink"}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full appearance-none rounded-lg border border-stone-300 bg-white py-2.5 pl-3.5 pr-10 text-ink outline-none motion-safe:transition focus:border-pine-700 focus:ring-2 focus:ring-marigold-500/40 aria-invalid:border-red-500${className ? ` ${className}` : ""}`}
          {...props}
        >
          {children}
        </select>
        {/* Replaces the native arrow that appearance-none removes. */}
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  ),
);
Select.displayName = "Select";
