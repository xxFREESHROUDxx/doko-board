import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/apiClient";
import { useAuth } from "../auth/authContext";
import type { User } from "../../types/api";

export interface UpdateProfileInput {
  username?: string;
  email?: string;
  /** null removes the picture. Omit the key to leave it untouched. */
  avatarUrl?: string | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiRequest<User>("/users/me", { method: "PATCH", body: input }),
    onSuccess: (user) => {
      updateUser(user);
      // Member lists embed a copy of each user, so every avatar and name drawn
      // from them — the board, the top bar cluster, the members dialog — is now
      // stale. Matched by shape because the project id sits in the middle of
      // the key, so no single prefix covers them all.
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "projects" && query.queryKey[2] === "members",
      });
    },
  });
}
