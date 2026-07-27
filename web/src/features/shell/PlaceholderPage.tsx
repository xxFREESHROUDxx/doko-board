import type { ComponentType } from "react";
import type { IconProps } from "../../components/icons";

interface PlaceholderPageProps {
  title: string;
  icon?: ComponentType<IconProps>;
  copy?: string;
}

export function PlaceholderPage({ title, icon: Icon, copy }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine-900/5 text-pine-700">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h2 className="mt-4 font-display text-lg font-semibold text-ink">{title} is coming soon</h2>
      {copy && <p className="mt-1 max-w-sm text-sm text-ink/60">{copy}</p>}
    </div>
  );
}
