import { useCallback, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  memberKeys,
  membersQueryOptions,
  useAddMember,
  useMyRole,
  useProjectMembers,
} from "./api";
import { addMemberSchema, type AddMemberFormValues } from "./memberSchemas";
import { ASSIGNABLE_ROLES, ROLE_LABELS, canAdminister } from "./roles";
import { MemberRow } from "./MemberRow";
import { ApiError } from "../../lib/apiClient";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Select } from "../../components/Select";
import { Skeleton } from "../../components/Skeleton";
import { TextField } from "../../components/TextFields";
import type { ProjectMember } from "../../types/api";

const SKELETON_KEYS = ["a", "b", "c"];

export interface Notice {
  message: string;
  tone: "success" | "error";
}

interface MembersDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function MembersDialog({ projectId, open, onClose }: MembersDialogProps) {
  const membersQuery = useProjectMembers(projectId);
  const { role: myRole, isPending: rolePending } = useMyRole(projectId);
  // Any member mutation, from any row — closing mid-flight would drop its result.
  const busy = useIsMutating({ mutationKey: memberKeys.list(projectId) }) > 0;

  // Owned here rather than in a row: a row unmounts the moment its removal lands,
  // taking any state with it. Toasts can't be used at all — a modal <dialog> sits
  // in the top layer, so the toast host would render behind this dialog's backdrop.
  const [notice, setNotice] = useState<Notice | null>(null);
  const announce = useCallback((next: Notice) => setNotice(next), []);

  return (
    <Modal open={open} onClose={onClose} title="Members" size="lg" busy={busy}>
      <div className="flex flex-col gap-5">
        {/* Always mounted, so the live region exists before its content does. */}
        <div aria-live="polite" aria-atomic="true">
          {notice && (
            <p
              role={notice.tone === "error" ? "alert" : undefined}
              className={
                notice.tone === "error"
                  ? "rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                  : "rounded-lg border border-emerald-600/25 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
              }
            >
              {notice.message}
            </p>
          )}
        </div>

        {canAdminister(myRole) && <AddMemberForm projectId={projectId} onNotice={announce} />}

        {membersQuery.isPending || rolePending ? (
          <div role="status" className="flex flex-col gap-3">
            <span className="sr-only">Loading members…</span>
            {SKELETON_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-48 max-w-full" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : membersQuery.isError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm text-red-700">
              {membersQuery.error instanceof ApiError
                ? membersQuery.error.message
                : "Couldn't load members."}
            </p>
            <Button variant="secondary" onClick={() => void membersQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-200">
            {membersQuery.data.map((member) => (
              <MemberRow
                key={member.id}
                projectId={projectId}
                member={member}
                myRole={myRole}
                onNotice={announce}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

interface AddMemberFormProps {
  projectId: string;
  onNotice: (notice: Notice) => void;
}

function AddMemberForm({ projectId, onNotice }: AddMemberFormProps) {
  const addMember = useAddMember(projectId);
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const fieldId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });

  const onSubmit = async (values: AddMemberFormValues) => {
    setFormError(null);
    try {
      await addMember.mutateAsync(values);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
      return;
    }

    // The API answers 201 even when no account matches the email, so the only way
    // to know whether anyone was added is to re-read the list. fetchQuery, not
    // invalidateQueries: the latter swallows refetch errors, and a network blip
    // would then look exactly like "no such user" — telling the admin a flat lie
    // about who can reach the project.
    let members: ProjectMember[];
    try {
      members = await queryClient.fetchQuery({
        ...membersQueryOptions(projectId),
        staleTime: 0,
      });
    } catch {
      setFormError(
        "We couldn't refresh the member list, so this isn't confirmed. Reopen Members to check.",
      );
      return;
    }

    const added = members.find(
      (member) => member.user.email.toLowerCase() === values.email.toLowerCase(),
    );

    if (!added) {
      // Vague on purpose: the API hides whether an email is registered, and
      // naming that here hands project admins an account-enumeration oracle.
      setFormError("We couldn't add anyone with that address. Check it and try again.");
      return;
    }

    onNotice({
      message: `${added.user.username} added as ${ROLE_LABELS[added.role].toLowerCase()}`,
      tone: "success",
    });
    reset({ email: "", role: values.role });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-4"
    >
      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {formError}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <TextField
            label="Email"
            id={`${fieldId}-email`}
            type="email"
            autoComplete="off"
            placeholder="teammate@example.com"
            data-autofocus
            {...register("email")}
            error={errors.email?.message}
          />
        </div>
        <div className="sm:w-40">
          <Select label="Role" id={`${fieldId}-role`} {...register("role")}>
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? "Adding…" : "Add member"}
        </Button>
      </div>
    </form>
  );
}
