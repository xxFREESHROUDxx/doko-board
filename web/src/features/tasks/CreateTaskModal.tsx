import { useCreateTask } from "./api";
import { TaskForm } from "./TaskForm";
import { toTaskPayload, type TaskFormValues } from "./taskSchemas";
import { STATUS_LABELS } from "./taskMeta";
import { useToast } from "../../components/toastContext";
import { Modal } from "../../components/Modal";
import type { TaskStatus } from "../../types/api";

interface CreateTaskModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  /** Pre-selects the column the "Add task" button was pressed in. */
  initialStatus: TaskStatus;
}

export function CreateTaskModal({
  projectId,
  open,
  onClose,
  initialStatus,
}: CreateTaskModalProps) {
  const createTask = useCreateTask(projectId);
  const { showToast } = useToast();

  const handleSubmit = async (values: TaskFormValues) => {
    const task = await createTask.mutateAsync(toTaskPayload(values));
    showToast(`Task created in ${STATUS_LABELS[task.status].toLowerCase()}`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create task"
      size="lg"
      busy={createTask.isPending}
    >
      {/* Mounted only while open so each visit starts from clean defaults —
          react-hook-form reads defaultValues once, at mount. */}
      {open && (
        <TaskForm
          projectId={projectId}
          defaultValues={{
            title: "",
            description: "",
            status: initialStatus,
            priority: "MEDIUM",
            dueDate: "",
            assigneeId: "",
          }}
          submitLabel="Create task"
          pendingLabel="Creating…"
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
