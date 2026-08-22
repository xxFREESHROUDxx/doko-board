# DokoBoard — Claude Code Project Guide

DokoBoard is a Trello-style project management app. Monorepo: a **NestJS** API and a
**React + Vite** frontend. The backend is complete; the current work is finishing the
**frontend**. Named after the *doko*, the Nepali woven basket that carries a load.

## Repository layout

```
doko-board/
├── api/            NestJS backend (COMPLETE — treat as the source of truth for the API contract)
├── web/            React + Vite + TS frontend (IN PROGRESS — most work happens here)
├── docs/           Architecture, standards, tasks, design, deployment (READ THESE FIRST)
├── .claude/agents/ Specialised subagents
├── docker-compose.yml   Whole stack in containers (api/docker-compose.yml is Postgres only)
└── render.yaml     Render Blueprint for the API service
```

## Before you start any task

1. Read `docs/ARCHITECTURE.md` for how the system fits together and the decisions already made.
2. Read `docs/CODE_STANDARDS.md` for conventions, git workflow, and the do/don't list.
3. For frontend work, read `docs/FRONTEND_TASKS.md` (what to build, in order) and
   `docs/UI_DESIGN.md` (the design system and component specs).
4. Never invent backend behaviour. If you need to know a response shape, read the
   controller/DTO under `api/src/`, or run the API and check `http://localhost:3000/docs`.

## Stack (do not swap without being asked)

- **Frontend:** React, Vite, TypeScript (strict), TanStack Query v5 (server state),
  React Router v7, React Hook Form v7 + Zod v4, Tailwind CSS v4.
- **Backend:** NestJS 11, Prisma 6 + PostgreSQL, JWT (Passport), class-validator.
- **State rule:** server state → TanStack Query; client/UI state → React state or Context.
  Do **not** add Redux or Zustand unless explicitly asked.

## How to work

- Work in small, reviewable steps. Prefer a short plan before large changes.
- After writing or changing code, delegate to the **code-reviewer** agent, then to
  **qa-tester** for anything user-facing. Fix what they flag before finishing.
- Build against the real API contract. The frontend joins related data on the client
  (e.g. task assignee → member) rather than expecting the backend to embed it.
- Keep the app runnable at every step. Never leave the build broken.

## Golden rules (full list in docs/CODE_STANDARDS.md)

- TypeScript strict. No `any` — use `unknown` + narrowing. No non-null `!` to silence errors.
- No secrets in code. Config comes from env (`import.meta.env.VITE_*` on the web side).
- Client validation is UX only; the server is the real boundary. Mirror, don't replace.
- No `localStorage`/`sessionStorage` in Artifacts, and never log tokens or PII.
- Conventional Commits (`feat:`, `fix:`, `chore:` …). Small, focused commits. Never
  `git push --force` to `main`. Feature branches + PRs.
- Accessibility floor: labelled inputs, visible keyboard focus, respect reduced motion.

## Deployment and infrastructure

Deployment notes live in `docs/` rather than here, because this file is loaded
into context on every request and those documents are long. Read the one you
need:

- **`docs/DEPLOY_FREE.md`** — the live path: Vercel (web) + Render (API) +
  Neon (Postgres), free, from this monorepo. Exact settings, in order, with the
  CORS chicken-and-egg spelled out. Railway is *not* free any more; that doc
  says why.
- **`docs/DOCKER.md`** — the Dockerfiles explained line by line. Read this
  before changing `api/Dockerfile` or `web/Dockerfile`.
- **`docs/AWS_DEPLOYMENT.md`** — how the same stack maps onto AWS (ECR,
  App Runner, RDS, Amplify), what it costs, and what bites.

Three facts about this app that deployments keep tripping over:

1. **`VITE_API_URL` is compiled in, not read at runtime.** Vite substitutes
   `import.meta.env.*` during the build. Changing it needs a rebuild, not a
   restart — and whatever is in it ships publicly in the bundle.
2. **`CORS_ORIGIN` must be the frontend's exact origin.** Wrong or missing, the
   app loads and every request fails, which looks like the API being down.
3. **Migrations are a discrete step** (`npx prisma migrate deploy`), never
   something the API does on boot — two instances starting together would race.
   They need devDependencies, so a production-only install cannot run them.

## Commands

```bash
# frontend (run from web/)
npm run dev            # Vite dev server on :5173
npm run build          # production build
npm run lint           # eslint

# backend (run from api/)
npm run db             # portable Postgres on :5432 — no Docker needed, leave running
npm run db:seed        # demo users, projects and tasks (idempotent)
npm run start:dev      # Nest on :3000, Swagger at /docs
npx prisma studio      # inspect the database

# whole stack in containers (from the repo root)
docker compose up --build   # web :8080, api :3000
```
