import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "./api";
import { STATUS_LABELS } from "./taskMeta";
import { apiRequest, ApiError } from "../../lib/apiClient";
import { useToast } from "../../components/toastContext";
import type { Task, TaskStatus } from "../../types/api";

interface MoveVariables {
  taskId: string;
  status: TaskStatus;
  /** Only for the messages; the request carries just the status. */
  title: string;
}

interface MoveContext {
  previous: Task[] | undefined;
}

/**
 * Moves a task between columns, optimistically.
 *
 * Dragging a card has to land where it was dropped straight away — waiting for a
 * round trip before the card moves makes the board feel broken. So the cache is
 * written first and rolled back if the server refuses.
 *
 * Feedback lives in the hook rather than in per-call callbacks because an
 * optimistic move unmounts the card from its old column immediately; a callback
 * passed to mutate() would be skipped once that observer is gone, and a refused
 * move would roll back with nothing to explain why.
 */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const queryKey = taskKeys.list(projectId);

  return useMutation<Task, unknown, MoveVariables, MoveContext>({
    mutationFn: ({ taskId, status }) =>
      apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: { status },
      }),

    onMutate: async ({ taskId, status }) => {
      // An in-flight refetch would land after this write and undo it.
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Task[]>(queryKey);
      queryClient.setQueryData<Task[]>(queryKey, (current) =>
        current?.map((task) => (task.id === taskId ? { ...task, status } : task)),
      );

      return { previous };
    },

    onError: (error, { title }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      showToast(
        error instanceof ApiError ? error.message : `Couldn't move "${title}"`,
        "error",
      );
    },

    onSuccess: (_task, { title, status }) => {
      showToast(`"${title}" moved to ${STATUS_LABELS[status].toLowerCase()}`);
    },

    // Reconcile with the server either way — the optimistic row is a guess.
    onSettled: () => queryClient.invalidateQueries({ queryKey, exact: true }),
  });
}
