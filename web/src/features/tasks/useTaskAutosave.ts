import { useCallback, useState } from "react";
import { useUpdateTask, type TaskPayload } from "./api";
import { ApiError } from "../../lib/apiClient";

export type TaskPatch = Partial<TaskPayload>;

export interface TaskAutosave {
  /** Applies a patch and reports whether it stuck. Never throws. */
  commit: (patch: TaskPatch) => Promise<boolean>;
  /** Values written but not yet confirmed — render these over the server's. */
  pending: TaskPatch;
  isSaving: boolean;
  error: string | null;
  dismissError: () => void;
  /** True once a save has succeeded, for the "Saved" indicator. */
  hasSaved: boolean;
}

/**
 * Field-at-a-time saving for the task panel: every control writes immediately
 * instead of collecting into a Save button.
 *
 * Each in-flight field is held in `pending` so the control shows the value the
 * user chose rather than snapping back to the server's for a round trip. A
 * rejected save simply drops out of `pending`, which reverts the control to the
 * server value and surfaces the message — no separate rollback path.
 */
export function useTaskAutosave(projectId: string, taskId: string): TaskAutosave {
  const updateTask = useUpdateTask(projectId);
  const [pending, setPending] = useState<TaskPatch>({});
  const [inFlight, setInFlight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  const commit = useCallback(
    async (patch: TaskPatch) => {
      setError(null);
      setPending((current) => ({ ...current, ...patch }));
      setInFlight((count) => count + 1);

      try {
        // mutateAsync, not mutate: each call gets its own mutation, so two
        // fields saved in quick succession both resolve. The observer's own
        // callbacks would not — the second call detaches it from the first.
        await updateTask.mutateAsync({ taskId, data: patch });
        setHasSaved(true);
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't save that change");
        return false;
      } finally {
        setInFlight((count) => count - 1);
        setPending((current) => {
          const next = { ...current };
          for (const key of Object.keys(patch)) {
            delete next[key as keyof TaskPatch];
          }
          return next;
        });
      }
    },
    [updateTask, taskId],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { commit, pending, isSaving: inFlight > 0, error, dismissError, hasSaved };
}
