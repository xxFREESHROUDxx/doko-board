import type { ComponentType } from "react";
import {
  BellIcon,
  CalendarIcon,
  InboxIcon,
  KanbanIcon,
  LayoutGridIcon,
  type IconProps,
} from "../../components/icons";

export interface NavLinkItem {
  label: string;
  icon: ComponentType<IconProps>;
  to: string;
  end?: boolean;
}

export interface NavSoonItem {
  label: string;
  icon: ComponentType<IconProps>;
  soon: true;
}

export type NavItem = NavLinkItem | NavSoonItem;

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: "nav-overview",
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutGridIcon, to: "/", end: true },
      { label: "Projects", icon: KanbanIcon, to: "/projects" },
      { label: "Calendar", icon: CalendarIcon, to: "/calendar" },
    ],
  },
  {
    id: "nav-tools",
    label: "Tools",
    items: [
      { label: "Notifications", icon: BellIcon, soon: true },
      { label: "Inbox", icon: InboxIcon, soon: true },
    ],
  },
];
