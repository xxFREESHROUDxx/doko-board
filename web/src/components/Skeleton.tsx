interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-md bg-stone-200/70 motion-safe:animate-pulse${className ? ` ${className}` : ""}`}
    />
  );
}
