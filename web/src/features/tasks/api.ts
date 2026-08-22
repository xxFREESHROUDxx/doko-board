import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import { projectKeys } from "../projects/api";
import type { Task, TaskPriority, TaskStatus } from "../../types/api";

export const taskKeys = {
  // Nested under the project detail key so deleting a project sweeps this away too.
  list: (projectId: string) => [...projectKeys.detail(projectId), "tasks"] as const,
};

export function tasksQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: taskKeys.list(projectId),
    queryFn: () => apiRequest<Task[]>(`/projects/${projectId}/tasks`),
  });
}

export function useTasks(projectId: string) {
  return useQuery(tasksQueryOptions(projectId));
}

export interface TaskPayload {
  title: string;
  // null clears the field; the API's UpdateTaskDto rejects "" for description
  // (@MinLength(1)) and treats null as "unset", so never send an empty string.
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string | null;
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TaskPayload) =>
      apiRequest<Task>(`/projects/${projectId}/tasks`, { method: "POST", body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId), exact: true }),
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<TaskPayload> }) =>
      apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId), exact: true }),
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      apiRequest<null>(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId), exact: true }),
  });
}
