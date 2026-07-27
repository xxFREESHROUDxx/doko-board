import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateProject } from "./api";
import { projectSchema, type ProjectFormValues } from "./projectSchemas";
import { ApiError } from "../../lib/apiClient";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { TextField } from "../../components/TextFields";
import { Textarea } from "../../components/Textarea";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const createProject = useCreateProject();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({ resolver: zodResolver(projectSchema) });

  // Every close path (Esc, backdrop, Cancel, success) funnels through here via the
  // Modal's native close event, so the form is always clean on the next open.
  // Idempotent: closing fires it more than once.
  const handleClose = () => {
    reset({ name: "", description: "" });
    setFormError(null);
    onClose();
  };

  const onSubmit = async (values: ProjectFormValues) => {
    setFormError(null);
    try {
      // The API rejects unknown keys, so send description only when it has content.
      const body = values.description
        ? { name: values.name, description: values.description }
        : { name: values.name };
      await createProject.mutateAsync(body);
      handleClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create project" busy={isSubmitting}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {formError}
          </div>
        )}
        {/* data-autofocus: Modal focuses this after showModal() — React's autoFocus
            is a no-op because the field mounts inside a closed <dialog>. */}
        <TextField
          label="Name"
          id="project-name"
          data-autofocus
          {...register("name")}
          error={errors.name?.message}
        />
        <Textarea
          label="Description (optional)"
          id="project-description"
          rows={3}
          {...register("description")}
          error={errors.description?.message}
        />
        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
