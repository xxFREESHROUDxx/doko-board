import type { ChangeEvent } from "react";
import { PRIORITY_LABELS, PRIORITY_TONES, STATUS_LABELS, TASK_STATUSES } from "./taskMeta";
import { formatDueDate, isOverdue } from "../../lib/dates";
import { AvatarStack } from "../../components/AvatarStack";
import { Chip } from "../../components/Chip";
import { Select } from "../../components/Select";
import type { Task, TaskStatus, User } from "../../types/api";

interface TaskCardProps {
  task: Task;
  /** userId -> user for this project; assignees are stored as a bare id. */
  memberMap: Map<string, User> | undefined;
  onSelect: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  /** True while this card's own status PATCH is in flight. */
  isMoving: boolean;
}

export function TaskCard({
  task,
  memberMap,
  onSelect,
  onStatusChange,
  isMoving,
}: TaskCardProps) {
  const overdue = task.dueDate !== null && task.status !== "DONE" && isOverdue(task.dueDate);

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(task, event.target.value as TaskStatus);
  };

  return (
    <li className="relative rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm motion-safe:transition-[box-shadow,border-color] motion-safe:duration-150 hover:border-stone-300 hover:shadow-md">
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
          className="line-clamp-2 rounded text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-marigold-500/50"
        >
          {task.title}
        </button>
      </h4>

      <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
        <Select
          hideLabel
          label={`Status for ${task.title}`}
          id={`task-status-${task.id}`}
          value={task.status}
          onChange={handleStatusChange}
          disabled={isMoving}
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

  const assignee = memberMap?.get(task.assigneeId);

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

  return (
    <AvatarStack names={[assignee.username]} label={`Assigned to ${assignee.username}`} />
  );
}
