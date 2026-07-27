// Kept out of Button.tsx: react-refresh requires component files to export only
// components, and links styled as buttons need this recipe too.
export type ButtonVariant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 disabled:pointer-events-none disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-150";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-pine-900 text-paper hover:bg-pine-700",
  secondary: "border border-stone-300 bg-white text-ink hover:border-stone-400 hover:bg-stone-50",
  ghost: "text-ink/70 hover:bg-stone-100 hover:text-ink",
};

/** Full class recipe for a button variant — for links that should look like buttons. */
export function buttonClasses(variant: ButtonVariant = "primary"): string {
  return `${BASE} ${VARIANTS[variant]}`;
}
