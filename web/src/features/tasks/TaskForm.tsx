import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, type TaskFormValues } from "./taskSchemas";
import { PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITIES, TASK_STATUSES } from "./taskMeta";
import { useProjectMembers } from "../members/api";
import { ApiError } from "../../lib/apiClient";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { TextField } from "../../components/TextFields";
import { LazyMarkdownEditor } from "../../components/LazyMarkdownEditor";

interface TaskFormProps {
  projectId: string;
  defaultValues: TaskFormValues;
  submitLabel: string;
  pendingLabel: string;
  /** Throw an ApiError to surface the server's message above the form. */
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({
  projectId,
  defaultValues,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { data: members } = useProjectMembers(projectId);
  const [formError, setFormError] = useState<string | null>(null);
  // Two of these can be mounted at once (create modal, edit drawer) — unique ids
  // keep every <label for> pointing at the right control.
  const fieldId = useId();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema), defaultValues });

  const submit = async (values: TaskFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <TextField
        label="Title"
        id={`${fieldId}-title`}
        data-autofocus
        {...register("title")}
        error={errors.title?.message}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <LazyMarkdownEditor
            label="Description (optional)"
            value={field.value}
            onChange={field.onChange}
            onCommit={field.onBlur}
            placeholder="Add more detail. Markdown works here."
            minRows={6}
            error={errors.description?.message}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Status" id={`${fieldId}-status`} {...register("status")}>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>

        <Select label="Priority" id={`${fieldId}-priority`} {...register("priority")}>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>

        <TextField
          label="Due date (optional)"
          id={`${fieldId}-dueDate`}
          type="date"
          {...register("dueDate")}
          error={errors.dueDate?.message}
        />

        {/* Controlled, unlike the others: the option list arrives with the member
            query, and an uncontrolled select silently drops a value it has no
            option for — so an assigned task would read "Unassigned" on a cold
            cache while the form still held the real id. React re-applies the
            value to a controlled select once the options land. */}
        <Controller
          control={control}
          name="assigneeId"
          render={({ field }) => (
            <Select label="Assignee" id={`${fieldId}-assigneeId`} {...field}>
              <option value="">Unassigned</option>
              {/* The API rejects an assignee who isn't a project member, so the
                  list is exactly the membership. */}
              {members?.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.username}
                </option>
              ))}
            </Select>
          )}
        />
      </div>

      <div className="mt-2 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
