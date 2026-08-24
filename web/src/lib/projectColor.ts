// Full class strings so Tailwind's scanner sees them (never build class names dynamically).
const PROJECT_COLORS = [
  "bg-pine-700",
  "bg-marigold-500",
  "bg-emerald-600",
  "bg-sky-600",
  "bg-violet-600",
  "bg-teal-600",
] as const;

// Hash on the id (stable across renames) so a project keeps its color.
export function projectColor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return PROJECT_COLORS[sum % PROJECT_COLORS.length];
}
