# DokoBoard Architecture

A Trello-style project management app. Monorepo: `api/` (NestJS) + `web/` (React + Vite).

## Backend (complete — the contract to build against)

**Stack:** NestJS 11, Prisma 6 + PostgreSQL, JWT via Passport, class-validator, Swagger at `/docs`.

**Data model (Prisma):**
- `User` — id, email, username, passwordHash (never returned raw; mapped to a public shape).
- `Project` — id, name, description, timestamps.
- `ProjectMember` — id, role, joinedAt, links a User to a Project. Role enum:
  `OWNER > ADMIN > MEMBER > VIEWER`.
- `Task` — id, title, description, `status` (`TODO | IN_PROGRESS | IN_REVIEW | DONE`),
  `priority` (`LOW | MEDIUM | HIGH | URGENT`), dueDate, projectId, assigneeId, createdById,
  timestamps.

**Auth:** stateless JWT. Register/login return `{ accessToken, user }`. Send
`Authorization: Bearer <token>`. `GET /auth/me` re-validates the token and returns the user.
No refresh token yet.

**Unified response envelope (all endpoints):**
- Success: `{ success: true, data: <T>, message: string | null, error: null }`
- Failure: `{ success: false, data: null, message: string, error: { statusCode, details?, path, timestamp } }`
- Implemented by a global interceptor (success) + exception filter (errors). Controllers
  stay unaware of it.

**Endpoints (all under JWT except register/login):**
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET|POST /projects`, `GET|PATCH|DELETE /projects/:id`
- `GET|POST /projects/:id/members`, `PATCH|DELETE /projects/:id/members/:userId`
- `GET|POST /projects/:id/tasks`, `GET|PATCH|DELETE /projects/:id/tasks/:taskId`

**Deliberate contract choices the frontend must respect:**
- Responses are **lean**: lists return bare rows with no embedded relations or counts, and
  `GET /projects/:id` does not include your role. The frontend loads members once and
  **joins on the client** (assignee/creator id → user; own role → gate UI).
- `POST /projects/:id/members` returns no meaningful body and silently ignores an unknown
  email (privacy). The UI refetches the member list after adding; it cannot distinguish
  "added" from "no such user". A real invitation flow is future work.
- Authorization is enforced on the server. Client-side role checks only hide controls.

## Frontend (in progress)

**Stack:** React + Vite + TS (strict), TanStack Query v5, React Router v7,
React Hook Form v7 + Zod v4, Tailwind v4.

**The core principle — server vs client state:** server state (projects, tasks, members,
current user) is cached by TanStack Query; client/UI state (open modal, dragged card, form
input, theme) lives in React state/Context. This split is why there is no Redux/Zustand.

**Layers (each talks only to the one below):**
`Components → feature hooks (TanStack Query) → apiClient (fetch + auth header + error
normalise + unwrap envelope) → API`. Auth state (Context, token in `localStorage`) supplies
the token to `apiClient` and gates routes.

**Folder layout (`web/src/`):**
```
lib/        apiClient.ts (only HTTP boundary), queryClient.ts
types/      api.ts (response shapes: User, Project, ProjectMember, Task + enums)
features/   auth/ (context, guards, login/register, schemas)
            projects/ tasks/ dashboard/  (hooks + screens per feature)
components/ shared dumb UI (TextField, Button, …)
```

**Auth flow:** on cold load, if a token exists, call `/auth/me` (show a splash while it
resolves — `isInitializing`) then render; a 401 anywhere clears the token and the router
sends the user to `/login`, preserving the intended destination.

**Query keys:** `['projects']`, `['projects', id]`, `['projects', id, 'members']`,
`['projects', id, 'tasks']`. Invalidate the narrowest key after each mutation.

**Token storage:** `localStorage` (MVP tradeoff — simple, survives refresh, XSS-readable).
Upgrade path: httpOnly cookie + refresh token. Documented, deferred.

For deeper backend rationale see the project's Notion docs; for the frontend build plan see
`FRONTEND_TASKS.md`; for visuals see `UI_DESIGN.md`.
