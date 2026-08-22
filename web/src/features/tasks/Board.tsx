import { useMemo, useState } from "react";
import { useTasks, useUpdateTask } from "./api";
import { BoardColumn } from "./BoardColumn";
import { BoardToolbar } from "./BoardToolbar";
import { CreateTaskModal } from "./CreateTaskModal";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { groupTasksByStatus } from "./boardModel";
import {
  ANY,
  DEFAULT_FILTERS,
  comparatorFor,
  filterTasks,
  type BoardFilters,
} from "./boardFilters";
import { STATUS_LABELS, TASK_STATUSES } from "./taskMeta";
import { useMemberMap, useProjectMembers } from "../members/api";
import { ApiError } from "../../lib/apiClient";
import { useToast } from "../../components/toastContext";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { ClipboardIcon, PlusIcon, SearchIcon } from "../../components/icons";
import type { Task, TaskStatus } from "../../types/api";

const SKELETON_CARDS = ["a", "b", "c"];

export function Board({ projectId }: { projectId: string }) {
  const tasksQuery = useTasks(projectId);
  // Same cache entry, two shapes: the map resolves assignees on cards, the list
  // fills the assignee filter. TanStack dedupes them into one request.
  const { data: memberMap } = useMemberMap(projectId);
  const { data: members } = useProjectMembers(projectId);
  const updateTask = useUpdateTask(projectId);
  const { showToast } = useToast();

  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  // The status the create modal opens with; null means the modal is closed.
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);
  // Held by id, not by value, so the drawer always renders the freshest copy
  // and closes by itself if the task disappears from the list.
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tasks = tasksQuery.data;

  // Filtering and sorting run over the cached list — no request is made for any
  // of the toolbar controls.
  const visibleTasks = useMemo(() => filterTasks(tasks ?? [], filters), [tasks, filters]);
  const columns = useMemo(
    () => groupTasksByStatus(visibleTasks, comparatorFor(filters.sort)),
    [visibleTasks, filters.sort],
  );

  const selectedTask = tasks?.find((task) => task.id === selectedTaskId) ?? null;

  const clearFilters = () =>
    setFilters((current) => ({ ...current, search: "", priority: ANY, assignee: ANY }));

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    updateTask.mutate(
      { taskId: task.id, data: { status } },
      {
        onSuccess: () =>
          showToast(`"${task.title}" moved to ${STATUS_LABELS[status].toLowerCase()}`),
        onError: (err) =>
          showToast(err instanceof ApiError ? err.message : "Couldn't move this task", "error"),
      },
    );
  };

  const movingTaskId = updateTask.isPending ? (updateTask.variables?.taskId ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <BoardToolbar
        filters={filters}
        onChange={setFilters}
        members={members}
        onNewTask={() => setCreateStatus("TODO")}
        visibleCount={visibleTasks.length}
        totalCount={tasks?.length ?? 0}
      />

      {tasksQuery.isPending ? (
        <div role="status" className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4">
          <span className="sr-only">Loading tasks…</span>
          {TASK_STATUSES.map((status) => (
            <div key={status} className="w-72 shrink-0 rounded-xl bg-stone-100/70 p-3 lg:w-auto">
              <Skeleton className="mb-3 h-4 w-28" />
              <div className="flex flex-col gap-2.5">
                {SKELETON_CARDS.map((key) => (
                  <div key={key} className="rounded-xl border border-stone-200 bg-white p-3.5">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="mt-2.5 h-4 w-full" />
                    <Skeleton className="mt-3 h-4 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <p className="text-sm text-red-700">
            {tasksQuery.error instanceof ApiError
              ? tasksQuery.error.message
              : "Couldn't load this board."}
          </p>
          <Button variant="secondary" onClick={() => void tasksQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : tasksQuery.data.length === 0 ? (
        // Four empty columns say less than one clear invitation.
        <EmptyState
          as="h3"
          className="min-h-[45vh]"
          icon={ClipboardIcon}
          title="No tasks yet"
          description="Add the first task to get this board moving."
          action={
            <Button onClick={() => setCreateStatus("TODO")}>
              <PlusIcon className="h-4 w-4" />
              Create task
            </Button>
          }
        />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          as="h3"
          className="min-h-[45vh]"
          icon={SearchIcon}
          title="No matching tasks"
          description="Nothing on this board matches the current search and filters."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-x-visible">
          {TASK_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              tasks={columns[status]}
              memberMap={memberMap}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onStatusChange={handleStatusChange}
              onAddTask={setCreateStatus}
              movingTaskId={movingTaskId}
            />
          ))}
        </div>
      )}

      <CreateTaskModal
        projectId={projectId}
        open={createStatus !== null}
        onClose={() => setCreateStatus(null)}
        initialStatus={createStatus ?? "TODO"}
      />
      <TaskDetailDrawer
        projectId={projectId}
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
