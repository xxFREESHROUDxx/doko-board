import { useState, type ChangeEvent } from "react";
import { useUpdateTask } from "./api";
import { PRIORITY_LABELS, PRIORITY_TONES, STATUS_LABELS, TASK_STATUSES } from "./taskMeta";
import { formatDueDate, isOverdue } from "../../lib/dates";
import { ApiError } from "../../lib/apiClient";
import { useToast } from "../../components/toastContext";
import { AvatarStack } from "../../components/AvatarStack";
import { Chip } from "../../components/Chip";
import { Select } from "../../components/Select";
import type { Task, TaskStatus, User } from "../../types/api";

interface TaskCardProps {
  task: Task;
  /** userId -> user for this project; assignees are stored as a bare id.
   *  `undefined` means the member list hasn't resolved, not "no members". */
  memberMap: Map<string, User> | undefined;
  onSelect: (task: Task) => void;
}

export function TaskCard({ task, memberMap, onSelect }: TaskCardProps) {
  // Each card owns its mutation. A board-level observer would be re-pointed by
  // the next card to move, and query-core detaches it from the in-flight one —
  // so an earlier card's failure would never reach any callback.
  const updateTask = useUpdateTask(task.projectId);
  const { showToast } = useToast();
  // Shown while the PATCH is in flight, so the select doesn't snap back to the
  // old status for a whole round trip.
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);

  const overdue = task.dueDate !== null && task.status !== "DONE" && isOverdue(task.dueDate);

  const handleStatusChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const status = event.target.value as TaskStatus;
    // Guarded here rather than by disabling the control: disabling the element
    // that currently has focus blurs it, dropping a keyboard user back to <body>.
    if (status === task.status || updateTask.isPending) return;

    setPendingStatus(status);
    try {
      // mutateAsync, not mutate's callbacks: a successful move unmounts this card
      // from its old column, and callbacks are skipped once the observer is gone.
      await updateTask.mutateAsync({ taskId: task.id, data: { status } });
      showToast(`"${task.title}" moved to ${STATUS_LABELS[status].toLowerCase()}`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't move this task", "error");
    } finally {
      setPendingStatus(null);
    }
  };

  return (
    <li className="relative cursor-pointer rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm motion-safe:transition-[box-shadow,border-color] motion-safe:duration-150 hover:border-stone-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Chip tone={PRIORITY_TONES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Chip>
        {task.dueDate && (
          <span
            className={`shrink-0 text-xs ${overdue ? "font-medium text-red-700" : "text-ink/60"}`}
          >
            {/* "Overdue" is spelled out — colour alone must never carry the meaning. */}
            {overdue ? "Overdue · " : "Due "}
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>

      <h4 className="mt-2 text-sm font-medium text-ink">
        {/* Stretched link: the ::after overlay makes the whole card clickable while
            keeping one real focus target. Controls below sit above it via z-10. */}
        <button
          type="button"
          onClick={() => onSelect(task)}
          className="line-clamp-2 cursor-pointer rounded text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-marigold-500/50"
        >
          {task.title}
        </button>
      </h4>

      <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
        <Select
          hideLabel
          label={`Status for ${task.title}`}
          id={`task-status-${task.id}`}
          value={pendingStatus ?? task.status}
          onChange={handleStatusChange}
          aria-busy={updateTask.isPending || undefined}
          className="text-xs"
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Assignee task={task} memberMap={memberMap} />
      </div>
    </li>
  );
}

function Assignee({ task, memberMap }: Pick<TaskCardProps, "task" | "memberMap">) {
  if (task.assigneeId === null) return null;

  // No member map yet — loading, or the request failed. "Not in the map" and
  // "not loaded" are indistinguishable here, and /tasks routinely wins the race
  // against /members, so guessing would flash a claim that isn't true.
  if (!memberMap) return null;

  const assignee = memberMap.get(task.assigneeId);

  if (!assignee) {
    // Assigned to someone who has since left the project — the id outlives the
    // membership, so say so rather than silently rendering nothing.
    return (
      <span
        role="img"
        aria-label="Assigned to someone who is no longer a member"
        title="Assigned to someone who is no longer a member"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-ink/60"
      >
        ?
      </span>
    );
  }

  return <AvatarStack names={[assignee.username]} label={`Assigned to ${assignee.username}`} />;
}
