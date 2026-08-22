import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProject } from "./api";
import { useProjectMembers } from "../members/api";
import { MembersDialog } from "../members/MembersDialog";
import { Board } from "../tasks/Board";
import { Button } from "../../components/Button";
import { projectColor } from "../../lib/projectColor";
import { ApiError } from "../../lib/apiClient";
import { buttonClasses } from "../../components/buttonStyles";
import { Skeleton } from "../../components/Skeleton";
import { UsersIcon } from "../../components/icons";

export function ProjectBoardPage() {
  const { projectId } = useParams();

  // The route guarantees the param; this guard just narrows the type for the inner
  // component so its hooks can run unconditionally with a plain string.
  if (!projectId) return null;

  return <ProjectBoard projectId={projectId} />;
}

function ProjectBoard({ projectId }: { projectId: string }) {
  const { data: project, isPending, isError, error } = useProject(projectId);
  const [membersOpen, setMembersOpen] = useState(false);

  if (isPending) {
    return (
      <div role="status">
        <span className="sr-only">Loading project…</span>
        <div className="flex items-start gap-3">
          <Skeleton className="mt-2 h-5 w-5 rounded-md" />
          <div className="min-w-0">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    // 400 = malformed id in the URL; to the user that's the same as "not found",
    // and the backend's raw copy ("Validation failed (uuid is expected)") isn't friendly.
    const message =
      error instanceof ApiError
        ? error.status === 404 || error.status === 400
          ? "This project doesn't exist or you don't have access."
          : error.message
        : "Couldn't load this project.";
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5"
      >
        <p className="text-sm text-red-700">{message}</p>
        <Link to="/" className={buttonClasses("secondary")}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-2 h-5 w-5 shrink-0 rounded-md ${projectColor(project.id)}`}
          />
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl font-semibold text-ink">
              {project.name}
            </h2>
            {project.description && (
              <p className="mt-1 max-w-2xl text-sm text-ink/60">{project.description}</p>
            )}
          </div>
        </div>
        <MembersButton projectId={projectId} onClick={() => setMembersOpen(true)} />
      </div>

      <Board projectId={projectId} />

      {/* Mounted only while open: Modal always renders its children, so a
          persistent dialog would keep a half-typed email and a row stuck
          mid-confirmation across a close and reopen. */}
      {membersOpen && (
        <MembersDialog projectId={projectId} open onClose={() => setMembersOpen(false)} />
      )}
    </div>
  );
}

function MembersButton({ projectId, onClick }: { projectId: string; onClick: () => void }) {
  const { data: members } = useProjectMembers(projectId);

  return (
    <Button variant="secondary" onClick={onClick}>
      <UsersIcon className="h-4 w-4" />
      Members
      {members && (
        <span className="rounded-full bg-stone-100 px-1.5 text-xs font-medium text-ink/70">
          {members.length}
        </span>
      )}
    </Button>
  );
}
