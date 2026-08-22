# Code Standards & Workflow

## TypeScript

- `strict` is on. Do not weaken `tsconfig` to make an error go away.
- No `any`. Use `unknown` and narrow, or write the real type. No `@ts-ignore` without a
  one-line reason comment.
- Don't use the non-null assertion `!` to silence the compiler; handle the null case.
- Prefer string-literal unions over TS `enum` for values that mirror API strings.
- Derive types from a single source where possible (Zod `z.infer`, Prisma types).

## React / frontend

- Function components and hooks only. No class components.
- Server state lives in TanStack Query; UI state in `useState`/`useReducer`/Context.
  Do not cache server data in Context or module variables.
- Components never call `fetch` directly. They call a feature hook, which calls the
  typed `apiClient`. One responsibility per layer.
- Co-locate by feature: `web/src/features/<feature>/` owns that feature's hooks,
  components, and screens. Shared dumb UI goes in `web/src/components/`.
- Query keys are hierarchical and defined once per feature (e.g.
  `['projects']`, `['projects', id]`, `['projects', id, 'tasks']`). Invalidate the
  narrowest key that covers the change after a mutation.
- Every query renders three states deliberately: loading, error, and empty. No silent
  blank screens.

## Security

- No secrets, tokens, or keys in source or logs. Frontend config via `import.meta.env.VITE_*`.
- Client-side role checks (hiding buttons) are UX only. Never treat them as access control;
  the server enforces. Do not build features that assume the client can be trusted.
- Never log the JWT, passwords, or PII.
- Sanitise nothing by hand for XSS — rely on React's escaping; never use
  `dangerouslySetInnerHTML` with server or user data.

## Testing

- Unit tests (Vitest + React Testing Library) for hooks and non-trivial components.
- E2E (Playwright) for the critical flows: register, login, create project, create task,
  move task across columns, logout.
- A user-facing change is not "done" until the qa-tester agent has verified it against the
  task's acceptance criteria.

## Git workflow

- Branch per task: `feat/projects-list`, `fix/login-redirect`, `chore/tailwind-tokens`.
- **Conventional Commits.** Format: `type(scope): summary`.
  - `feat(projects): list projects on the dashboard`
  - `fix(auth): redirect to intended route after login`
  - `refactor(api-client): extract error normaliser`
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`.
- Small, focused commits — one logical change each. Don't mix a refactor with a feature.
- Open a PR into `main`. Never commit directly to `main`, never `git push --force` to it.
- A PR must build (`npm run build`) and pass lint and tests before it can merge.

## Do

- Read the relevant `docs/` file before starting.
- Match the existing patterns already in the codebase.
- Keep the app runnable after every commit.
- Ask (or leave a `// TODO(question):`) when the API contract is unclear — don't guess.
- Write copy in sentence case, active voice ("Create task", not "Task Creation").

## Don't

- Don't add dependencies without justification. Preferences already decided: no Redux,
  no Zustand, no axios, no component library, no date library (use `Intl`). Drag-and-drop
  (`@dnd-kit`) is deferred until the basic board works.
- Don't change the backend to make the frontend easier without flagging it first.
- Don't introduce a new styling system; use Tailwind v4 with the project tokens.
- Don't leave `console.log` in committed code.
- Don't broaden types or disable lint rules to pass CI.
