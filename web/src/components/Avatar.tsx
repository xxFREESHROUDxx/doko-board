import type { HTMLAttributes } from "react";

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  /** A data URI from the user's profile. Falls back to initials when absent. */
  src?: string | null;
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
} as const;

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ name, src, size = "md", className, ...props }: AvatarProps) {
  const classes = `flex ${sizeClasses[size]} shrink-0 items-center justify-center overflow-hidden rounded-full bg-pine-700 font-medium text-paper`;

  return (
    <span className={className ? `${classes} ${className}` : classes} {...props}>
      {src ? (
        // alt="" — the picture carries no information the surrounding label
        // doesn't already give, and callers name the person themselves.
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
