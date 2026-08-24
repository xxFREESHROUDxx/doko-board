import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useDeleteProject, useUpdateProject } from "./api";
import { projectSchema, type ProjectFormValues } from "./projectSchemas";
import { useMyRole } from "../members/api";
import { canAdminister, canDeleteProject } from "../members/roles";
import { useTasks } from "../tasks/api";
import { ApiError } from "../../lib/apiClient";
import { useToast } from "../../components/toastContext";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { TextField } from "../../components/TextFields";
import { Textarea } from "../../components/Textarea";
import type { Project } from "../../types/api";

interface ProjectSettingsDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
}

export function ProjectSettingsDialog({ project, open, onClose }: ProjectSettingsDialogProps) {
  const { role: myRole } = useMyRole(project.id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const busy = updateProject.isPending || deleteProject.isPending;

  return (
    <Modal open={open} onClose={onClose} title="Project settings" busy={busy}>
      <div className="flex flex-col gap-6">
        {canAdminister(myRole) ? (
          <RenameForm project={project} onClose={onClose} />
        ) : (
          <p className="text-sm text-ink/60">
            Only an owner or admin can change this project&apos;s details.
          </p>
        )}

        {/* Mirrors assertOwner: deleting is the owner's call alone. */}
        {canDeleteProject(myRole) && <DangerZone project={project} />}
      </div>
    </Modal>
  );
}

function RenameForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const updateProject = useUpdateProject();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    setFormError(null);
    try {
      await updateProject.mutateAsync({
        id: project.id,
        // null, not "": clearing needs an explicit null, and the API treats an
        // empty string as a value rather than an unset.
        data: { name: values.name, description: values.description || null },
      });
      showToast("Project updated");
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <TextField
        label="Name"
        id="project-settings-name"
        data-autofocus
        {...register("name")}
        error={errors.name?.message}
      />
      <Textarea
        label="Description (optional)"
        id="project-settings-description"
        rows={3}
        {...register("description")}
        error={errors.description?.message}
      />

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function DangerZone({ project }: { project: Project }) {
  const deleteProject = useDeleteProject();
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Only to say how much goes with it — the board has this cached already.
  const { data: tasks } = useTasks(project.id);

  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Deleting cascades to every task and membership, so make the user name the
  // thing they're destroying rather than click one more button by reflex.
  const canDelete = typed.trim() === project.name;

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteProject.mutateAsync(project.id);
      // Leave before the toast: this route's queries are gone.
      navigate("/", { replace: true });
      showToast(`"${project.name}" deleted`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this project");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Delete this project</h3>
        <p className="mt-1 text-sm text-ink/70">
          {tasks
            ? `Its ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} go with it.`
            : "Every task in it goes with it."}{" "}
          This cannot be undone.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-white px-3.5 py-2.5 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {confirming ? (
        <div className="flex flex-col gap-3">
          <TextField
            label={`Type "${project.name}" to confirm`}
            id="project-delete-confirm"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
              disabled={deleteProject.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={!canDelete}
              loading={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Deleting…" : "Delete project"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete project
          </Button>
        </div>
      )}
    </div>
  );
}
