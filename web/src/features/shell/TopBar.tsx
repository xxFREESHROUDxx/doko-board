import { useEffect } from "react";
import { useMatches } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import { MenuIcon } from "../../components/icons";
import { useAuth } from "../auth/authContext";
import { ProjectChips } from "../projects/ProjectChips";
import { isRouteHandle } from "./routeHandle";

interface TopBarProps {
  onOpenNav: () => void;
  navOpen: boolean;
}

export function TopBar({ onOpenNav, navOpen }: TopBarProps) {
  const matches = useMatches();
  const { user } = useAuth();

  // The deepest match with a valid handle wins (later matches override earlier ones).
  const title =
    matches.reduce<string | null>(
      (acc, match) => (isRouteHandle(match.handle) ? match.handle.title : acc),
      null,
    ) ?? "DokoBoard";

  useEffect(() => {
    document.title = `${title} · DokoBoard`;
  }, [title]);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-stone-200 bg-paper/90 px-4 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={navOpen}
        aria-controls="mobile-nav"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/70 hover:bg-stone-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-colors motion-safe:duration-150 lg:hidden"
      >
        <MenuIcon />
      </button>
      <h1 className="min-w-0 truncate font-display text-3xl font-semibold text-ink">{title}</h1>
      <ProjectChips />
      {/* TODO(task-3): member avatar cluster renders here. */}
      {user && <Avatar name={user.username} title={user.username} className="ml-auto" />}
    </header>
  );
}
