import type { ComponentType } from "react";
import type { IconProps } from "../../components/icons";
import { EmptyState } from "../../components/EmptyState";
import { KanbanIcon } from "../../components/icons";

interface PlaceholderPageProps {
  title: string;
  icon?: ComponentType<IconProps>;
  copy?: string;
}

export function PlaceholderPage({ title, icon: Icon = KanbanIcon, copy }: PlaceholderPageProps) {
  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={Icon}
      title={`${title} is coming soon`}
      description={copy}
    />
  );
}
