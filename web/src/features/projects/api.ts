import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { Project } from "../../types/api";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
};

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export type UpdateProjectInput = Partial<CreateProjectInput>;

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => apiRequest<Project[]>("/projects"),
  });
}

export function useProject(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiRequest<Project>(`/projects/${id}`),
    // placeholderData (not initialData): the list row fills the screen instantly
    // while the real fetch still runs — initialData would be cached and suppress it.
    placeholderData: () =>
      queryClient.getQueryData<Project[]>(projectKeys.all)?.find((p) => p.id === id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiRequest<Project>("/projects", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      apiRequest<Project>(`/projects/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      // The ["projects"] prefix covers both the reordered list and every detail entry.
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      // Drop the detail entry first so invalidation doesn't refetch a 404.
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
