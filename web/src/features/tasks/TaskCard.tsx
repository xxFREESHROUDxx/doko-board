import type { ChangeEvent, PointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMoveTask } from "./useMoveTask";
import { PRIORITY_LABELS, PRIORITY_TONES, STATUS_LABELS, TASK_STATUSES } from "./taskMeta";
import { formatDueDate, isOverdue } from "../../lib/dates";
import { AvatarStack } from "../../components/AvatarStack";
import { Chip } from "../../components/Chip";
import { Select } from "../../components/Select";
import { GripIcon } from "../../components/icons";
import type { Task, TaskStatus, User } from "../../types/api";

interface TaskCardProps {
  task: Task;
  /** userId -> user for this project; assignees are stored as a bare id.
   *  `undefined` means the member list hasn't resolved, not "no members". */
  memberMap: Map<string, User> | undefined;
  onSelect: (task: Task) => void;
  /** False inside the drag overlay, which is a static copy of the card. */
  draggable?: boolean;
}

export function TaskCard({ task, memberMap, onSelect, draggable = true }: TaskCardProps) {
  const moveTask = useMoveTask(task.projectId);

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const status = event.target.value as TaskStatus;
    if (status === task.status) return;
    moveTask.mutate({ taskId: task.id, status, title: task.title });
  };

  return (
    <CardShell task={task} draggable={draggable}>
      <div className="flex items-start justify-between gap-2">
        <Chip tone={PRIORITY_TONES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Chip>
        {task.dueDate && <DueDate task={task} />}
      </div>

      <h4 className="mt-2 text-sm font-medium text-ink">
        {/* Stretched link: the ::after overlay makes the whole card clickable while
            keeping one real focus target. Controls sit above it via z-10. */}
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
          value={task.status}
          onChange={handleStatusChange}
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
    </CardShell>
  );
}

interface CardShellProps {
  task: Task;
  draggable: boolean;
  children: React.ReactNode;
}

/**
 * The card frame plus its drag affordances.
 *
 * Pointer dragging works from anywhere on the card; keyboard dragging works
 * from the grip. They have to be split because dnd-kit's `listeners` carries
 * both onPointerDown and onKeyDown, and the keyboard half needs a focusable
 * element — making the whole <li> focusable would put every card in the tab
 * order twice. So the card takes the pointer half and the grip takes the rest.
 *
 * A 5px activation distance (see Board's sensors) keeps a click a click, so the
 * title button and the status select still work normally.
 */
function CardShell({ task, draggable, children }: CardShellProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled: !draggable });

  // Split the listener map: the card takes the pointer half, the grip takes the
  // rest (onKeyDown). Spreading avoids casting dnd-kit's loosely typed handlers.
  const { onPointerDown, ...keyboardListeners } = listeners ?? {};

  const startPointerDrag = (event: PointerEvent<HTMLLIElement>) => {
    // A native select captures the pointer while its dropdown is open, so the
    // pointerup can go missing and leave the card stuck mid-drag. Let the
    // control have the gesture; the rest of the card is still draggable.
    if ((event.target as HTMLElement).closest("select")) return;
    onPointerDown?.(event);
  };

  return (
    <li
      ref={setNodeRef}
      onPointerDown={draggable ? startPointerDrag : undefined}
      // The overlay renders the card being dragged; leave a gap behind it rather
      // than a duplicate. Not display:none — the column would reflow mid-drag.
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : undefined }}
      className="relative cursor-pointer rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm motion-safe:transition-[box-shadow,border-color] motion-safe:duration-150 hover:border-stone-300 hover:shadow-md"
    >
      {draggable && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...keyboardListeners}
          type="button"
          aria-label={`Move ${task.title}`}
          // touch-action stays on the grip alone. On the whole card it would
          // kill vertical scrolling over the board on a touch screen.
          className="absolute right-1.5 top-1.5 z-10 inline-flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-md text-ink/30 hover:bg-stone-100 hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 active:cursor-grabbing motion-safe:transition-colors motion-safe:duration-150"
        >
          <GripIcon className="h-4 w-4" />
        </button>
      )}
      {children}
    </li>
  );
}

function DueDate({ task }: { task: Task }) {
  const overdue = task.dueDate !== null && task.status !== "DONE" && isOverdue(task.dueDate);
  if (task.dueDate === null) return null;

  return (
    // Right padding clears the grip handle in the corner.
    <span
      className={`shrink-0 pr-7 text-xs ${overdue ? "font-medium text-red-700" : "text-ink/60"}`}
    >
      {/* "Overdue" is spelled out — colour alone must never carry the meaning. */}
      {overdue ? "Overdue · " : "Due "}
      {formatDueDate(task.dueDate)}
    </span>
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

  return (
    <AvatarStack
      people={[{ name: assignee.username, avatarUrl: assignee.avatarUrl }]}
      label={`Assigned to ${assignee.username}`}
    />
  );
}
