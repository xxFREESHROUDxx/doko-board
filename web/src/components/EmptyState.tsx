import type { ComponentType, ReactNode } from "react";
import type { IconProps } from "./icons";

interface EmptyStateProps {
  icon: ComponentType<IconProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Heading level — pick the one that fits the surrounding outline. */
  as?: "h2" | "h3";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  as: Heading = "h2",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center${className ? ` ${className}` : ""}`}
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine-900/5 text-pine-700"
      >
        <Icon className="h-6 w-6" />
      </div>
      <Heading className="mt-4 font-display text-lg font-semibold text-ink">{title}</Heading>
      {description && <p className="mt-1 max-w-sm text-sm text-ink/60">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
