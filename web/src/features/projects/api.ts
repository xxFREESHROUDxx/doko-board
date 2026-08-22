import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import type { Project } from "../../types/api";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
};

// A project's sub-resources (members, tasks) key off projectKeys.detail(id), so
// the detail key is a prefix of theirs. Invalidations below therefore pass
// `exact: true` — a bare ["projects"] invalidation would refetch every member
// and task list in the cache just because a project was renamed. Deletion is the
// one place that *wants* the prefix sweep.

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  // null clears the description. UpdateProjectDto marks it @IsOptional(), which
  // in class-validator skips null as well as undefined, so it reaches Prisma —
  // and Project.description is nullable. Sending "" would store an empty string.
  description?: string | null;
}

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
      void queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      apiRequest<Project>(`/projects/${id}`, { method: "PATCH", body: data }),
    onSuccess: (_data, { id }) => {
      // The list reorders by updatedAt, and this project's detail row changed.
      void queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(id), exact: true });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      // Prefix removal on purpose: drops the detail entry *and* the project's
      // members/tasks, so nothing refetches into a 404.
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all, exact: true });
    },
  });
}
