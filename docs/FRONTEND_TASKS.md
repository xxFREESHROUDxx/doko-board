# Frontend Build Plan

Ordered tasks to finish DokoBoard's `web/` app. Do them top to bottom — each builds on the
last. Every task: implement (frontend-engineer) → review (code-reviewer) → verify
(qa-tester) → one Conventional-Commit PR. Keep the app runnable throughout.

## Already done
- Data layer: `apiClient` (auth header, envelope unwrap, error normalise), `queryClient`,
  `types/api.ts`.
- Auth: `AuthContext` + `/auth/me` bootstrap, login & register (RHF + Zod), route guards,
  React Router setup, dashboard placeholder.

---

## 1. App shell (sidebar + top bar)
Build the authenticated layout from `UI_DESIGN.md`: fixed left sidebar (wordmark, nav:
Dashboard, Projects/Board, Calendar placeholder; bottom: settings, user card with logout)
and a top bar (page title, project chips, avatar cluster). Protected pages render inside it
via an `<Outlet/>` layout route.
**Done when:** shell renders on all protected routes, is responsive (sidebar collapses on
mobile), nav highlights the active route, logout works.

## 2. Projects layer (first real TanStack Query)
`features/projects/api.ts`: `useProjects`, `useProject(id)`, `useCreateProject`,
`useUpdateProject`, `useDeleteProject` with correct query keys and invalidation. Dashboard
lists the user's projects as cards; a "New project" modal (RHF + Zod) creates one and the
list updates from cache invalidation.
**Done when:** projects load with loading/error/empty states; creating a project shows it
without a manual refresh; a project card links to its board.

## 3. Members + client-side joins
`useProjectMembers(projectId)`. Build a `Map<userId, user>` for the project and a helper for
"my role in this project" (used to gate UI). Add-member and change-role UI for OWNER/ADMIN
(offer only ADMIN/MEMBER/VIEWER). After add, refetch the member list.
**Done when:** members render; role-gated controls appear only for OWNER/ADMIN; assignee
lookups elsewhere use the member map.

## 4. Board (Kanban) — the centrepiece
`useTasks(projectId)`. Render four columns by `status` (Not started / On progress / On
review / Completed) with counts. Card anatomy per `UI_DESIGN.md`: priority chip, title,
due date (via `Intl`), assignee avatars (from the member map), project/label chip. Group
tasks by status client-side; sort within a column by priority then due date.
**Done when:** the board matches the design; columns show counts; empty columns show a
designed empty state; cards show real task data.

## 5. Task create / edit / delete
`useCreateTask`, `useUpdateTask`, `useDeleteTask`. "Create task" opens a modal (title,
description, status, priority, due date, assignee from members). Clicking a card opens a
detail/edit drawer. Moving a task between columns = a status `PATCH` (dropdown/select for
now; drag-and-drop is a later enhancement).
**Done when:** full task CRUD works with cache invalidation; moving a card persists the new
status; validation mirrors the backend.

## 6. Search, filter, sort
Client-side search box (by title), filter by priority/assignee, sort control — operating on
the already-cached task list. No new endpoints.
**Done when:** controls filter/sort the board live without refetching.

## 7. Polish & robustness
Skeletons for loading, friendly 404 for missing/deleted projects, toasts for mutation
success/error (surface `ApiError.message`), `refetchOnWindowFocus` behaviour confirmed,
full keyboard/a11y pass, reduced-motion check.
**Done when:** no blank/janky states; errors are legible; keyboard-only use works.

## 8. Optional: drag-and-drop
Add `@dnd-kit` to drag cards between columns with an optimistic update; on failure (e.g.
VIEWER, or task deleted elsewhere) roll back and toast. Only start once 1–7 are solid.

## 9. Deploy
Follow `DEPLOYMENT.md`: build `web/` to a static host, point it at the hosted API via
`VITE_API_URL`, confirm CORS. Smoke-test the critical flows in production.

---

### Acceptance criteria apply to every task
- `npm run build` + `npm run lint` clean; tests for the flow pass.
- Loading, error, and empty states handled.
- Matches `UI_DESIGN.md`; reuses shared components; a11y floor met.
- Reviewed and QA-verified before the PR is opened.
