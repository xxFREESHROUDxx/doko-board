import { Link } from "react-router-dom";
import { projectColor } from "../../lib/projectColor";
import type { Project } from "../../types/api";

const updatedFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <li>
      <Link
        to={`/projects/${project.id}`}
        className="group flex h-full flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-[box-shadow,border-color] motion-safe:duration-150"
      >
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 rounded ${projectColor(project.id)}`}
          />
          <h3 className="min-w-0 truncate text-sm font-semibold text-ink">{project.name}</h3>
        </div>
        {project.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-ink/60">{project.description}</p>
        ) : (
          <p className="mt-2 text-sm text-ink/60">No description</p>
        )}
        <p className="mt-auto pt-4 text-xs text-ink/60">
          Updated {updatedFormatter.format(new Date(project.updatedAt))}
        </p>
      </Link>
    </li>
  );
}
