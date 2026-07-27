import { useState } from "react";
import { useProjects } from "../projects/api";
import { CreateProjectModal } from "../projects/CreateProjectModal";
import { ProjectCard } from "../projects/ProjectCard";
import { ApiError } from "../../lib/apiClient";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { FolderIcon, PlusIcon } from "../../components/icons";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

export function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  // Kept as one object (not destructured) so TS can narrow `data` per status branch.
  const projectsQuery = useProjects();

  const isEmpty =
    !projectsQuery.isPending && !projectsQuery.isError && projectsQuery.data.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Your projects</h2>
        {/* The empty state owns the CTA — one bold spot per screen. */}
        {!isEmpty && (
          <Button onClick={() => setModalOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            New project
          </Button>
        )}
      </div>

      {projectsQuery.isPending ? (
        <div role="status" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Loading projects…</span>
          {SKELETON_KEYS.map((key) => (
            <div key={key} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="mt-3 h-3.5 w-full" />
              <Skeleton className="mt-2 h-3.5 w-4/5" />
              <Skeleton className="mt-5 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : projectsQuery.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-sm text-red-700">
            {projectsQuery.error instanceof ApiError
              ? projectsQuery.error.message
              : "Couldn't load your projects."}
          </p>
          <Button variant="secondary" onClick={() => void projectsQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          as="h3"
          className="min-h-[50vh]"
          icon={FolderIcon}
          title="No projects yet"
          description="Create your first project to start organizing tasks."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              New project
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projectsQuery.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </ul>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
