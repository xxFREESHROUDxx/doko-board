import { NavLink } from "react-router-dom";
import { useProjects } from "./api";
import { projectColor } from "../../lib/projectColor";

// Background lives in each branch (not the base) so the active bg can't lose a
// CSS-order fight with bg-white — Tailwind emits both as background-color.
const CHIP_BASE =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-colors motion-safe:duration-150";

export function ProjectChips() {
  const { data: projects } = useProjects();

  // Chrome stays quiet: no skeletons or errors in the top bar.
  if (!projects || projects.length === 0) return null;

  return (
    <nav
      aria-label="Projects"
      className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex"
    >
      {projects.map((project) => (
        <NavLink
          key={project.id}
          to={`/projects/${project.id}`}
          className={({ isActive }) =>
            isActive
              ? `${CHIP_BASE} border-pine-700 bg-pine-900/[0.04] font-medium text-pine-900`
              : `${CHIP_BASE} border-stone-200 bg-white text-ink/70 hover:border-stone-300 hover:text-ink`
          }
        >
          <span
            aria-hidden="true"
            className={`h-3 w-3 shrink-0 rounded-sm ${projectColor(project.id)}`}
          />
          <span className="max-w-32 truncate">{project.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
