import { Fragment, useId, type ComponentType } from "react";
import { Link, NavLink, useMatch } from "react-router-dom";
import { useProjects } from "../projects/api";
import { recallProject } from "../projects/lastProject";
import { Avatar } from "../../components/Avatar";
import { LogOutIcon, SettingsIcon, XIcon, type IconProps } from "../../components/icons";
import { useAuth } from "../auth/authContext";
import { navGroups } from "./navItems";

const navLinkBase =
  "relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? `${navLinkBase} bg-pine-900/[0.04] font-medium text-pine-900`
    : `${navLinkBase} text-ink/70 hover:bg-stone-100 hover:text-ink`;
}

interface NavItemLinkProps {
  to: string;
  end?: boolean;
  label: string;
  icon: ComponentType<IconProps>;
  onNavigate?: () => void;
}

function NavItemLink({ to, end, label, icon: Icon, onNavigate }: NavItemLinkProps) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className={navLinkClass}>
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-marigold-500"
            />
          )}
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </>
      )}
    </NavLink>
  );
}

/**
 * The Board link, pointing at whichever project you are in — or were last in,
 * falling back to your first project. Previously this was a fixed /projects
 * link to a "coming soon" placeholder, so it was a dead end from the dashboard
 * and lost its target the moment you visited any other section.
 */
function BoardNavLink({ label, icon: Icon, onNavigate }: Omit<NavItemLinkProps, "to">) {
  const { data: projects } = useProjects();
  const match = useMatch("/projects/:projectId");
  const activeProjectId = match?.params.projectId;

  // Only trust a remembered id that still exists — projects get deleted, and
  // people are shared out of them.
  const remembered = recallProject();
  const fallback =
    projects?.find((project) => project.id === remembered)?.id ?? projects?.[0]?.id;
  const target = activeProjectId ?? fallback;

  // No projects yet: the dashboard owns the "create your first one" prompt.
  const to = target ? `/projects/${target}` : "/";
  // NavLink would compare against this one project's URL, so any *other* board
  // would read as inactive. The route match is the real answer.
  const isActive = match !== null;

  return (
    <NavLink to={to} onClick={onNavigate} className={() => navLinkClass({ isActive })}>
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-marigold-500"
        />
      )}
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </NavLink>
  );
}

interface SidebarProps {
  /** Called on any nav link click — the mobile drawer uses it to close itself. */
  onNavigate?: () => void;
  /** When set, renders a close button in the wordmark row (mobile drawer only). */
  onClose?: () => void;
}

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  // Sidebar renders twice (desktop aside + mobile drawer); useId keeps the
  // group-label ids unique per instance so aria-labelledby resolves correctly.
  const idPrefix = useId();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link
          to="/"
          onClick={onNavigate}
          className="rounded-lg font-display text-2xl font-semibold text-pine-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50"
        >
          Doko<span className="text-marigold-500">Board</span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink/70 hover:bg-stone-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-colors motion-safe:duration-150"
          >
            <XIcon />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group, groupIndex) => (
          <Fragment key={group.id}>
            <p
              id={`${idPrefix}-${group.id}`}
              className={`px-3 ${groupIndex === 0 ? "pt-2" : "pt-6"} pb-2 text-xs font-medium uppercase tracking-wider text-ink/40`}
            >
              {group.label}
            </p>
            <ul aria-labelledby={`${idPrefix}-${group.id}`} className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.label}>
                  {"board" in item ? (
                    <BoardNavLink
                      label={item.label}
                      icon={item.icon}
                      onNavigate={onNavigate}
                    />
                  ) : "soon" in item ? (
                    <span className="flex min-h-10 cursor-default select-none items-center gap-3 rounded-lg px-3 text-sm text-ink/40">
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.label}
                      <span className="ml-auto rounded-full border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink/50">
                        Soon
                      </span>
                    </span>
                  ) : (
                    <NavItemLink
                      to={item.to}
                      end={item.end}
                      label={item.label}
                      icon={item.icon}
                      onNavigate={onNavigate}
                    />
                  )}
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </nav>

      <div className="relative border-t border-stone-200 px-3 py-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #123a2e 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, #123a2e 0 2px, transparent 2px 14px)",
          }}
        />
        <div className="relative">
          <NavItemLink to="/settings" label="Settings" icon={SettingsIcon} onNavigate={onNavigate} />
          {user && (
            <div className="mt-1 flex items-center gap-3 rounded-lg p-2">
              <Avatar name={user.username} src={user.avatarUrl} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user.username}</p>
                <p className="truncate text-xs text-ink/50">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink/50 hover:bg-stone-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-colors motion-safe:duration-150"
              >
                <LogOutIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
