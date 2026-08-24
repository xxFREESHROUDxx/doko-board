import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useDeleteTask } from "./api";
import { useTaskAutosave, type TaskPatch } from "./useTaskAutosave";
import {
  PRIORITY_LABELS,
  PRIORITY_TONES,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./taskMeta";
import { useMyRole, useProjectMembers } from "../members/api";
import { canDeleteTask } from "../members/roles";
import { useAuth } from "../auth/authContext";
import { ApiError } from "../../lib/apiClient";
import { formatDueDate, toDateInputValue, toDueDateIso } from "../../lib/dates";
import { useToast } from "../../components/toastContext";
import { Button } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { Drawer } from "../../components/Drawer";
import { LazyMarkdownEditor } from "../../components/LazyMarkdownEditor";
import { Select } from "../../components/Select";
import { CheckIcon } from "../../components/icons";
import type { Task, TaskPriority, TaskStatus } from "../../types/api";

interface TaskDetailDrawerProps {
  projectId: string;
  /** The task being viewed, or null when the drawer is closed. */
  task: Task | null;
  onClose: () => void;
}

export function TaskDetailDrawer({ projectId, task, onClose }: TaskDetailDrawerProps) {
  return (
    <Drawer
      open={task !== null}
      onClose={onClose}
      title="Task"
      size="lg"
    >
      {/* Keyed on the task id so switching cards starts from the new task's
          values rather than carrying the previous one's local edits. */}
      {task && <TaskDetail key={task.id} projectId={projectId} task={task} onClose={onClose} />}
    </Drawer>
  );
}

interface TaskDetailProps {
  projectId: string;
  task: Task;
  onClose: () => void;
}

function TaskDetail({ projectId, task, onClose }: TaskDetailProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { role: myRole } = useMyRole(projectId);
  const { data: members } = useProjectMembers(projectId);
  const deleteTask = useDeleteTask(projectId);
  const autosave = useTaskAutosave(projectId, task.id);

  // Text fields keep local state so typing isn't a request per keystroke; they
  // commit on blur. Everything else writes the moment it changes.
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /**
   * Everything the unmount flush needs, in one ref.
   *
   * `committedTitle`/`committedDescription` are the last values actually sent.
   * Comparing against those rather than against `task` makes a repeated commit
   * a no-op — clicking Preview blurs the textarea first, so both the blur and
   * the tab handler fire for a single edit.
   */
  const flush = useRef({
    title: task.title,
    description: task.description ?? "",
    committedTitle: task.title,
    committedDescription: task.description ?? "",
    commit: autosave.commit,
  });

  // Synced in an effect, never during render: mutating a ref while rendering is
  // unsafe under concurrent rendering. No dep array — this runs after every render.
  useEffect(() => {
    flush.current.title = title;
    flush.current.description = description;
    flush.current.commit = autosave.commit;
  });

  // Esc and the backdrop close the drawer without blurring the focused field, so
  // an in-progress edit would simply vanish. Flush whatever is still uncommitted.
  useEffect(() => {
    // Aliased so the cleanup reads the ref at unmount rather than capturing
    // today's value — which is exactly the point of holding it in a ref.
    const state = flush;
    return () => {
      const {
        title: nextTitle,
        description: nextDescription,
        committedTitle,
        committedDescription,
        commit,
      } = state.current;

      const patch: TaskPatch = {};
      const trimmedTitle = nextTitle.trim();
      // Skip an invalid title rather than firing a request the server will reject.
      if (
        trimmedTitle !== committedTitle &&
        trimmedTitle.length > 0 &&
        trimmedTitle.length <= 100
      ) {
        patch.title = trimmedTitle;
      }
      const trimmedDescription = nextDescription.trim();
      if (trimmedDescription !== committedDescription) {
        patch.description = trimmedDescription === "" ? null : trimmedDescription;
      }
      if (Object.keys(patch).length > 0) void commit(patch);
    };
  }, []);

  const mayDelete = canDeleteTask(myRole, task.createdById, user?.id);

  // Show what the user picked while it saves, not what the server still says.
  const status = autosave.pending.status ?? task.status;
  const priority = autosave.pending.priority ?? task.priority;
  const assigneeId = autosave.pending.assigneeId ?? task.assigneeId;
  const dueDate = autosave.pending.dueDate ?? task.dueDate;

  const commitTitle = async () => {
    const next = title.trim();
    if (next === flush.current.committedTitle) return;

    // Mirrors CreateTaskDto: 1-100 characters. The server is still the boundary.
    if (next.length === 0) {
      setTitleError("Title is required");
      return;
    }
    if (next.length > 100) {
      setTitleError("Title must be at most 100 characters");
      return;
    }

    setTitleError(null);
    flush.current.committedTitle = next;
    const saved = await autosave.commit({ title: next });
    // Put the server's value back if it refused, so the field never lies.
    if (!saved) {
      flush.current.committedTitle = task.title;
      setTitle(task.title);
    }
  };

  const commitDescription = async () => {
    const next = description.trim();
    if (next === flush.current.committedDescription) return;

    flush.current.committedDescription = next;
    // null, never "": UpdateTaskDto puts @MinLength(1) under @IsOptional(), so
    // an empty string is rejected while null clears the field.
    const saved = await autosave.commit({ description: next === "" ? null : next });
    if (!saved) {
      const current = task.description ?? "";
      flush.current.committedDescription = current;
      setDescription(current);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteTask.mutateAsync(task.id);
      onClose();
      showToast("Task deleted");
    } catch (err) {
      setConfirmingDelete(false);
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this task");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SaveBadge autosave={autosave} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="sr-only">
          Title
        </label>
        {/* Styled as a heading, not a form field — it only shows its edges on
            hover and focus, the way an inline-editable title should. */}
        <input
          id="task-title"
          data-autofocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          aria-invalid={!!titleError}
          aria-describedby={titleError ? "task-title-error" : undefined}
          className="-mx-2 rounded-lg border border-transparent px-2 py-1 font-display text-xl font-semibold text-ink outline-none hover:border-stone-300 focus:border-pine-700 focus:ring-2 focus:ring-marigold-500/40 aria-invalid:border-red-500 motion-safe:transition"
        />
        {titleError && (
          <p id="task-title-error" className="text-sm text-red-600">
            {titleError}
          </p>
        )}
      </div>

      <LazyMarkdownEditor
        label="Description"
        value={description}
        onChange={setDescription}
        onCommit={commitDescription}
        placeholder="Add more detail. Markdown works here."
        minRows={10}
      />

      <div className="grid grid-cols-1 gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
        <Select
          label="Status"
          id="task-detail-status"
          value={status}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            void autosave.commit({ status: event.target.value as TaskStatus })
          }
        >
          {TASK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>

        <Select
          label="Priority"
          id="task-detail-priority"
          value={priority}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            void autosave.commit({ priority: event.target.value as TaskPriority })
          }
        >
          {TASK_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </Select>

        <Select
          label="Assignee"
          id="task-detail-assignee"
          value={assigneeId ?? ""}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            void autosave.commit({ assigneeId: event.target.value || null })
          }
        >
          <option value="">Unassigned</option>
          {members?.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.username}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-detail-due" className="text-sm font-medium text-ink">
            Due date
          </label>
          <input
            id="task-detail-due"
            type="date"
            value={dueDate === null ? "" : toDateInputValue(dueDate)}
            onChange={(event) =>
              void autosave.commit({
                dueDate: event.target.value ? toDueDateIso(event.target.value) : null,
              })
            }
            className="rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-ink outline-none motion-safe:transition focus:border-pine-700 focus:ring-2 focus:ring-marigold-500/40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-5 text-xs text-ink/60">
        <Chip tone={PRIORITY_TONES[priority]}>{PRIORITY_LABELS[priority]}</Chip>
        <span>Created {formatDueDate(task.createdAt)}</span>
        <span aria-hidden="true">·</span>
        <span>Updated {formatDueDate(task.updatedAt)}</span>
      </div>

      {mayDelete && (
        <div className="flex flex-col gap-3 border-t border-stone-200 pt-5">
          {deleteError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {deleteError}
            </p>
          )}
          {confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink/70">Delete this task for everyone?</p>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleteTask.isPending}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete} loading={deleteTask.isPending}>
                  {deleteTask.isPending ? "Deleting…" : "Delete task"}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              Delete task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Tells the user their edits are being kept — there is no Save button to imply it. */
function SaveBadge({ autosave }: { autosave: ReturnType<typeof useTaskAutosave> }) {
  if (autosave.error) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
      >
        <span>{autosave.error}</span>
        <button
          type="button"
          onClick={autosave.dismissError}
          className="ml-auto rounded font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <p aria-live="polite" className="flex h-5 items-center gap-1.5 text-xs text-ink/50">
      {autosave.isSaving ? (
        "Saving…"
      ) : autosave.hasSaved ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
          Saved
        </>
      ) : (
        "Changes save as you make them"
      )}
    </p>
  );
}
