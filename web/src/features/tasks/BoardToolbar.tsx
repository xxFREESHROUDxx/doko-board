import { useId } from "react";
import {
  ANY,
  SORT_KEYS,
  SORT_LABELS,
  UNASSIGNED,
  hasActiveFilters,
  type BoardFilters,
} from "./boardFilters";
import { PRIORITY_LABELS, TASK_PRIORITIES } from "./taskMeta";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { PlusIcon, SearchIcon } from "../../components/icons";
import type { ProjectMember } from "../../types/api";

interface BoardToolbarProps {
  filters: BoardFilters;
  onChange: (next: BoardFilters) => void;
  members: ProjectMember[] | undefined;
  onNewTask: () => void;
  visibleCount: number;
  totalCount: number;
}

export function BoardToolbar({
  filters,
  onChange,
  members,
  onNewTask,
  visibleCount,
  totalCount,
}: BoardToolbarProps) {
  const fieldId = useId();
  const filtering = hasActiveFilters(filters);

  // Every control edits one key of the same object, so the caller only ever
  // handles a whole BoardFilters and re-derives the board from it.
  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor={`${fieldId}-search`} className="sr-only">
            Search tasks by title
          </label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
            />
            <input
              id={`${fieldId}-search`}
              type="search"
              value={filters.search}
              onChange={(event) => set("search", event.target.value)}
              placeholder="Search tasks"
              className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-ink outline-none motion-safe:transition focus:border-pine-700 focus:ring-2 focus:ring-marigold-500/40"
            />
          </div>
        </div>

        <Select
          hideLabel
          label="Filter by priority"
          id={`${fieldId}-priority`}
          value={filters.priority}
          onChange={(event) => set("priority", event.target.value as BoardFilters["priority"])}
          className="text-sm"
        >
          <option value={ANY}>All priorities</option>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>

        <Select
          hideLabel
          label="Filter by assignee"
          id={`${fieldId}-assignee`}
          value={filters.assignee}
          onChange={(event) => set("assignee", event.target.value)}
          className="text-sm"
        >
          <option value={ANY}>All assignees</option>
          <option value={UNASSIGNED}>Unassigned</option>
          {members?.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.username}
            </option>
          ))}
        </Select>

        <Select
          hideLabel
          label="Sort tasks by"
          id={`${fieldId}-sort`}
          value={filters.sort}
          onChange={(event) => set("sort", event.target.value as BoardFilters["sort"])}
          className="text-sm"
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              Sort: {SORT_LABELS[key]}
            </option>
          ))}
        </Select>

        <Button onClick={onNewTask}>
          <PlusIcon className="h-4 w-4" />
          New task
        </Button>
      </div>

      {/* Filtering hides cards from columns whose counts still change, so say
          plainly how much of the board is showing. The region itself is always
          mounted; only its contents come and go. */}
      <div aria-live="polite" className="flex items-center gap-3 text-xs text-ink/60">
        {filtering && (
          <>
            <span>
              Showing {visibleCount} of {totalCount} {totalCount === 1 ? "task" : "tasks"}
            </span>
            {/* When nothing matches, the empty state owns this action — one bold
                spot per screen, and two identically named buttons is a smell. */}
            {visibleCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...filters, search: "", priority: ANY, assignee: ANY })
                }
                className="rounded font-medium text-pine-700 underline underline-offset-2 hover:text-pine-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50"
              >
                Clear filters
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
