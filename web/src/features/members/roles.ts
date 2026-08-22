import type { ProjectRole } from "../../types/api";

/**
 * Roles this UI can assign. OWNER is granted at project creation and the API
 * rejects it on both add-member and change-role ("use the ownership transfer
 * endpoint"), so it is never an option here.
 */
export const ASSIGNABLE_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

/** Mirrors the API's assertCanAdminister: manage members, edit the project. */
export function canAdminister(role: ProjectRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Mirrors assertOwner: only the owner may delete a project. */
export function canDeleteProject(role: ProjectRole | null): boolean {
  return role === "OWNER";
}

/**
 * Mirrors ProjectsService.removeMember: the owner is untouchable here, and an
 * admin may not remove a peer admin (only the owner can).
 */
export function canRemoveMember(myRole: ProjectRole | null, targetRole: ProjectRole): boolean {
  if (!canAdminister(myRole)) return false;
  if (targetRole === "OWNER") return false;
  return !(myRole === "ADMIN" && targetRole === "ADMIN");
}

/** Mirrors ProjectsService.changeMemberRole: the owner's role is fixed. */
export function canChangeMemberRole(
  myRole: ProjectRole | null,
  targetRole: ProjectRole,
): boolean {
  return canAdminister(myRole) && targetRole !== "OWNER";
}

/**
 * Mirrors TasksService.delete: admins and owners delete anything, members only
 * what they created. `createdById` is nullable — the creator's account may be gone.
 */
export function canDeleteTask(
  myRole: ProjectRole | null,
  createdById: string | null,
  myUserId: string | undefined,
): boolean {
  if (myRole === null) return false;
  if (canAdminister(myRole)) return true;
  return createdById !== null && createdById === myUserId;
}
