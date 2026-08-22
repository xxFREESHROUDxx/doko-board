import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useChangeMemberRole, useRemoveMember } from "./api";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  canChangeMemberRole,
  canRemoveMember,
  type AssignableRole,
} from "./roles";
import type { Notice } from "./MembersDialog";
import { ApiError } from "../../lib/apiClient";
import { useAuth } from "../auth/authContext";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { Select } from "../../components/Select";
import { TrashIcon } from "../../components/icons";
import type { ProjectMember, ProjectRole } from "../../types/api";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

interface MemberRowProps {
  projectId: string;
  member: ProjectMember;
  myRole: ProjectRole | null;
  /** Reports the outcome to the dialog, which outlives this row. */
  onNotice: (notice: Notice) => void;
}

export function MemberRow({ projectId, member, myRole, onNotice }: MemberRowProps) {
  const { user } = useAuth();
  const changeRole = useChangeMemberRole(projectId);
  const removeMember = useRemoveMember(projectId);

  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // Shown while the PATCH is in flight so the select doesn't visibly snap back
  // to the old role for the duration of the request.
  const [pendingRole, setPendingRole] = useState<AssignableRole | null>(null);

  const cancelRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Swapping the trash button for the confirm pair unmounts the focused element,
  // which would drop focus to <body>. Move it deliberately, and hand it back.
  useEffect(() => {
    if (confirmingRemove) {
      cancelRef.current?.focus();
      wasConfirming.current = true;
    } else if (wasConfirming.current) {
      removeRef.current?.focus();
      wasConfirming.current = false;
    }
  }, [confirmingRemove]);

  const isMe = user?.id === member.user.id;
  const canChange = canChangeMemberRole(myRole, member.role);
  const canRemove = canRemoveMember(myRole, member.role);
  const busy = changeRole.isPending || removeMember.isPending;

  const handleRoleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const role = event.target.value as AssignableRole;
    setPendingRole(role);
    try {
      await changeRole.mutateAsync({ userId: member.user.id, role });
      onNotice({
        message: `${member.user.username} is now ${ROLE_LABELS[role].toLowerCase()}`,
        tone: "success",
      });
    } catch (err) {
      onNotice({ message: errorMessage(err, "Couldn't change the role"), tone: "error" });
    } finally {
      setPendingRole(null);
    }
  };

  // mutateAsync, not mutate's callbacks: a successful removal unmounts this row,
  // and mutate-level callbacks are skipped once the observer has no listeners.
  // The awaited promise still resolves, and onNotice belongs to the dialog above.
  const handleRemove = async () => {
    try {
      await removeMember.mutateAsync(member.user.id);
      onNotice({
        message: `${member.user.username} removed from the project`,
        tone: "success",
      });
    } catch (err) {
      setConfirmingRemove(false);
      onNotice({ message: errorMessage(err, "Couldn't remove this member"), tone: "error" });
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={member.user.username} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {member.user.username}
          {isMe && <span className="ml-1.5 font-normal text-ink/50">(you)</span>}
        </p>
        <p className="truncate text-sm text-ink/60">{member.user.email}</p>
      </div>

      {canChange ? (
        <Select
          hideLabel
          label={`Role for ${member.user.username}`}
          id={`member-role-${member.id}`}
          value={pendingRole ?? member.role}
          onChange={handleRoleChange}
          disabled={busy}
          className="text-sm"
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      ) : (
        <Chip tone={member.role === "OWNER" ? "pine" : "neutral"}>
          {ROLE_LABELS[member.role]}
        </Chip>
      )}

      {canRemove &&
        (confirmingRemove ? (
          // Inline rather than a nested dialog: the row itself is the context, and
          // stacking a second <dialog> over this one would steal focus twice.
          <span role="status" className="flex items-center gap-2">
            <Button
              ref={cancelRef}
              variant="ghost"
              onClick={() => setConfirmingRemove(false)}
              disabled={removeMember.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRemove}
              loading={removeMember.isPending}
            >
              {removeMember.isPending ? "Removing…" : "Remove"}
            </Button>
          </span>
        ) : (
          <button
            ref={removeRef}
            type="button"
            onClick={() => setConfirmingRemove(true)}
            disabled={busy}
            aria-label={`Remove ${member.user.username} from the project`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink/50 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 disabled:pointer-events-none disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-150"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ))}
    </li>
  );
}
