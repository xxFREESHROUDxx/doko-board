import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiRequest } from "../../lib/apiClient";
import { projectKeys } from "../projects/api";
import { taskKeys } from "../tasks/api";
import { useAuth } from "../auth/authContext";
import type { ProjectMember, ProjectRole, User } from "../../types/api";
import type { AssignableRole } from "./roles";

export const memberKeys = {
  // Nested under the project detail key so deleting a project sweeps this away too.
  list: (projectId: string) => [...projectKeys.detail(projectId), "members"] as const,
};

export function membersQueryOptions(projectId: string) {
  return queryOptions({
    queryKey: memberKeys.list(projectId),
    queryFn: () => apiRequest<ProjectMember[]>(`/projects/${projectId}/members`),
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery(membersQueryOptions(projectId));
}

// Module-level so the reference is stable — an inline `select` would rebuild the
// Map on every render and defeat TanStack's structural-sharing memoisation.
function toMemberMap(members: ProjectMember[]): Map<string, User> {
  return new Map(members.map((member) => [member.user.id, member.user]));
}

/**
 * userId -> user for everyone on the project. Tasks store a bare `assigneeId`,
 * so every assignee lookup on the board goes through this.
 */
export function useMemberMap(projectId: string) {
  return useQuery({ ...membersQueryOptions(projectId), select: toMemberMap });
}

export interface MyMembership {
  /** null once loaded means "not a member" — check isPending to tell them apart. */
  role: ProjectRole | null;
  isPending: boolean;
}

/**
 * The signed-in user's role on this project. `role` is null both while loading
 * and when the user isn't a member, so callers that gate UI must wait for
 * isPending to clear — otherwise an owner sees a read-only screen on first paint.
 */
export function useMyRole(projectId: string): MyMembership {
  const { user } = useAuth();
  const { data: members, isPending } = useProjectMembers(projectId);

  const role = useMemo(() => {
    if (!user || !members) return null;
    return members.find((member) => member.user.id === user.id)?.role ?? null;
  }, [members, user]);

  return { role, isPending };
}

export interface AddMemberInput {
  email: string;
  role: AssignableRole;
}

/**
 * Deliberately does NOT refresh the list itself. The API answers 201 even when
 * no account matches the email, so the caller has to re-read the list to learn
 * whether anyone was added — and it must be able to tell a failed re-read from
 * a genuine no-op. invalidateQueries swallows refetch errors, which would make
 * a network blip look like "no such user". Callers use fetchQuery instead; see
 * AddMemberForm.
 */
export function useAddMember(projectId: string) {
  return useMutation({
    mutationKey: memberKeys.list(projectId),
    mutationFn: (input: AddMemberInput) =>
      apiRequest<null>(`/projects/${projectId}/members`, { method: "POST", body: input }),
  });
}

export function useChangeMemberRole(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: memberKeys.list(projectId),
    mutationFn: ({ userId, role }: { userId: string; role: AssignableRole }) =>
      apiRequest<null>(`/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId), exact: true }),
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: memberKeys.list(projectId),
    mutationFn: (userId: string) =>
      apiRequest<null>(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: memberKeys.list(projectId), exact: true }),
        // Their tasks keep the now-unresolvable assigneeId; without this the
        // board would keep drawing a stale avatar from the old member map.
        queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId), exact: true }),
      ]),
  });
}
