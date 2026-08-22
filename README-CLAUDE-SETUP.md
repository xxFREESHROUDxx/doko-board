# DokoBoard — Claude Code automation setup

Drop these into your monorepo root so Claude Code picks them up. Final layout:

```
doko-board/
├── CLAUDE.md                         ← repo root (Claude Code loads this automatically)
├── .claude/
│   └── agents/
│       ├── frontend-engineer.md      ← builds frontend features
│       ├── ui-designer.md            ← polished, accessible UI
│       ├── code-reviewer.md          ← read-only quality + security review
│       └── qa-tester.md              ← writes/runs tests, checks acceptance
├── docs/
│   ├── ARCHITECTURE.md               ← system overview + API contract
│   ├── CODE_STANDARDS.md             ← conventions, git/commits, do & don't
│   ├── FRONTEND_TASKS.md             ← ordered build plan with acceptance criteria
│   ├── UI_DESIGN.md                  ← design system + component specs
│   └── DEPLOYMENT.md                 ← free hosting stack + steps
├── api/                              (your existing NestJS backend)
└── web/                             (your existing React + Vite frontend)
```

## How to use it
1. Copy the files in, keeping the paths above. Commit them
   (`chore: add Claude Code project setup`).
2. Start Claude Code from the repo root and **restart it once** after adding `.claude/agents/`
   so the new agents load.
3. Verify the agents loaded: ask Claude Code, "list the available subagents."
4. Drive the work task by task from `docs/FRONTEND_TASKS.md`, e.g.:
   > "Implement task 1 (app shell) from docs/FRONTEND_TASKS.md. Use the frontend-engineer
   > and ui-designer agents, then have code-reviewer and qa-tester check it, and open a PR."
5. Let it plan first on bigger tasks (plan mode), approve the plan, then build.

## Notes
- Agents are auto-delegated based on their `description`, or you can @-mention them.
- Keep `CLAUDE.md` lean — it loads into every session. Detail lives in `docs/`.
- Tweak any agent's prompt/tools to taste; they're plain markdown.
- Advanced: for parallel work you can run Claude Code in separate **git worktrees**
  (one branch per worktree) so two tasks progress without colliding.
