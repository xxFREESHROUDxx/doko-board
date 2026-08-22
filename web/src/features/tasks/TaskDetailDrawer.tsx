import { useState } from "react";
import { useDeleteTask, useUpdateTask } from "./api";
import { TaskForm } from "./TaskForm";
import { toFormValues, toTaskPayload, type TaskFormValues } from "./taskSchemas";
import { useMyRole } from "../members/api";
import { canDeleteTask } from "../members/roles";
import { useAuth } from "../auth/authContext";
import { ApiError } from "../../lib/apiClient";
import { formatDueDate } from "../../lib/dates";
import { useToast } from "../../components/toastContext";
import { Button } from "../../components/Button";
import { Drawer } from "../../components/Drawer";
import type { Task } from "../../types/api";

interface TaskDetailDrawerProps {
  projectId: string;
  /** The task being viewed, or null when the drawer is closed. */
  task: Task | null;
  onClose: () => void;
}

export function TaskDetailDrawer({ projectId, task, onClose }: TaskDetailDrawerProps) {
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const busy = updateTask.isPending || deleteTask.isPending;

  return (
    <Drawer open={task !== null} onClose={onClose} title="Task details" busy={busy}>
      {/* Keyed on the task id so switching cards resets the form to the new task. */}
      {task && (
        <TaskDetail
          key={task.id}
          projectId={projectId}
          task={task}
          onClose={onClose}
          updateTask={updateTask}
          deleteTask={deleteTask}
        />
      )}
    </Drawer>
  );
}

interface TaskDetailProps {
  projectId: string;
  task: Task;
  onClose: () => void;
  updateTask: ReturnType<typeof useUpdateTask>;
  deleteTask: ReturnType<typeof useDeleteTask>;
}

function TaskDetail({ projectId, task, onClose, updateTask, deleteTask }: TaskDetailProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { role: myRole } = useMyRole(projectId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Inline rather than a toast: this fires while the drawer is open, and a modal
  // dialog sits in the top layer where a normal-flow toast host can be covered.
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const mayDelete = canDeleteTask(myRole, task.createdById, user?.id);

  const handleSubmit = async (values: TaskFormValues) => {
    await updateTask.mutateAsync({ taskId: task.id, data: toTaskPayload(values) });
    showToast("Task updated");
    onClose();
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteTask.mutateAsync(task.id);
      onClose();
      showToast("Task deleted");
    } catch (err) {
      setConfirmingDelete(false);
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this task");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <TaskForm
        projectId={projectId}
        defaultValues={toFormValues(task)}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        onSubmit={handleSubmit}
        onCancel={onClose}
      />

      <dl className="grid grid-cols-2 gap-3 border-t border-stone-200 pt-4 text-xs">
        <div>
          <dt className="text-ink/50">Created</dt>
          <dd className="mt-0.5 text-ink/70">{formatDueDate(task.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Last updated</dt>
          <dd className="mt-0.5 text-ink/70">{formatDueDate(task.updatedAt)}</dd>
        </div>
      </dl>

      {mayDelete && (
        <div className="flex flex-col gap-3 border-t border-stone-200 pt-4">
          {deleteError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {deleteError}
            </p>
          )}
          {confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink/70">Delete this task for everyone?</p>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleteTask.isPending}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete} loading={deleteTask.isPending}>
                  {deleteTask.isPending ? "Deleting…" : "Delete task"}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              Delete task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
