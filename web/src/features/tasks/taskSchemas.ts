import * as z from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "./taskMeta";
import { toDateInputValue, toDueDateIso } from "../../lib/dates";
import type { TaskPayload } from "./api";
import type { Task } from "../../types/api";

/**
 * Mirrors CreateTaskDto/UpdateTaskDto. Empty strings are the form's "not set"
 * sentinel for the optional fields; toTaskPayload turns them into the null the
 * API wants. The server stays the real boundary — this is UX only.
 */
export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be at most 100 characters"),
  description: z.string().trim(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  /** "" or a yyyy-mm-dd value from <input type="date">. */
  dueDate: z.string(),
  /** "" or a member's user id. */
  assigneeId: z.string(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

/** Form values -> request body. "" becomes null so the API clears the field. */
export function toTaskPayload(values: TaskFormValues): TaskPayload {
  return {
    title: values.title,
    description: values.description === "" ? null : values.description,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate === "" ? null : toDueDateIso(values.dueDate),
    assigneeId: values.assigneeId === "" ? null : values.assigneeId,
  };
}

/** An existing task -> form values, using "" for the fields that aren't set. */
export function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate === null ? "" : toDateInputValue(task.dueDate),
    assigneeId: task.assigneeId ?? "",
  };
}
