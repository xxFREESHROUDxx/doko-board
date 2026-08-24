import type { ReactNode } from "react";

export type ChipTone = "neutral" | "pine" | "marigold" | "orange" | "red" | "emerald";

// Full class strings so Tailwind's scanner sees them (never build class names dynamically).
const TONES: Record<ChipTone, string> = {
  neutral: "border-stone-200 bg-stone-50 text-ink/70",
  pine: "border-pine-700/25 bg-pine-900/[0.06] text-pine-900",
  marigold: "border-marigold-500/35 bg-marigold-500/12 text-marigold-600",
  orange: "border-orange-600/25 bg-orange-50 text-orange-700",
  red: "border-red-600/25 bg-red-50 text-red-700",
  emerald: "border-emerald-600/25 bg-emerald-50 text-emerald-700",
};

interface ChipProps {
  tone?: ChipTone;
  /** Decorative mark before the label (a colored square or dot) — never the only signal. */
  leading?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Chip({ tone = "neutral", leading, className, children }: ChipProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}${className ? ` ${className}` : ""}`}
    >
      {leading}
      <span className="truncate">{children}</span>
    </span>
  );
}
