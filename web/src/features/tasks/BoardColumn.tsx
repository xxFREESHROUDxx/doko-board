import { TaskCard } from "./TaskCard";
import { STATUS_DOTS, STATUS_LABELS } from "./taskMeta";
import { PlusIcon } from "../../components/icons";
import type { Task, TaskStatus, User } from "../../types/api";

interface BoardColumnProps {
  status: TaskStatus;
  tasks: Task[];
  memberMap: Map<string, User> | undefined;
  onSelectTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function BoardColumn({
  status,
  tasks,
  memberMap,
  onSelectTask,
  onAddTask,
}: BoardColumnProps) {
  const label = STATUS_LABELS[status];

  return (
    <section
      aria-label={`${label} (${tasks.length})`}
      className="flex w-72 shrink-0 flex-col rounded-xl bg-stone-100/70 p-3 lg:w-auto"
    >
      <div className="flex items-center gap-2 px-1 pb-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[status]}`}
          />
          {label}
          <span className="rounded-full bg-white px-1.5 text-xs font-medium text-ink/60">
            {tasks.length}
          </span>
        </h3>
        <button
          type="button"
          onClick={() => onAddTask(status)}
          aria-label={`Add a task to ${label}`}
          className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink/50 hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-colors motion-safe:duration-150"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 px-3 py-8 text-center text-xs text-ink/50">
          Nothing {label.toLowerCase()}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              memberMap={memberMap}
              onSelect={onSelectTask}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
