import { Avatar } from "./Avatar";

interface AvatarStackProps {
  names: string[];
  /** Accessible name for the whole cluster, e.g. "Assigned to Ada, Grace". */
  label: string;
  /** Avatars shown before collapsing the rest into a "+N" bubble. */
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

const overflowSize = {
  sm: "h-7 w-7 text-[0.625rem]",
  md: "h-9 w-9 text-xs",
} as const;

export function AvatarStack({ names, label, max = 3, size = "sm", className }: AvatarStackProps) {
  if (names.length === 0) return null;

  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;

  return (
    // One label for the whole cluster: the individual avatars are decorative, and
    // reading "AB, CD, +2" as separate nodes is noise for a screen reader.
    <span
      className={`flex items-center${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={label}
    >
      {shown.map((name, index) => (
        <Avatar
          key={name}
          name={name}
          size={size}
          aria-hidden="true"
          title={name}
          className={index === 0 ? "ring-2 ring-white" : "-ml-2 ring-2 ring-white"}
        />
      ))}
      {overflow > 0 && (
        <span
          aria-hidden="true"
          className={`-ml-2 flex ${overflowSize[size]} shrink-0 items-center justify-center rounded-full bg-stone-200 font-medium text-ink/70 ring-2 ring-white`}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
