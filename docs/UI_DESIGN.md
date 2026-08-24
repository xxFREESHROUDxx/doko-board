# DokoBoard UI Design System

The target is a clean, modern SaaS dashboard — the layout structure of a polished kanban
tool (sidebar + top bar + task board with rich cards), rendered in **DokoBoard's own
identity**. Take structure and polish from references; do **not** copy any other product's
brand, colors, logo, or exact pixels.

## Identity

- **Palette (Tailwind v4 `@theme` tokens):**
  - `--color-pine-950 #0c2a20`, `--color-pine-900 #123a2e`, `--color-pine-700 #1c5442`
  - `--color-marigold-500 #e0a82e`, `--color-marigold-600 #c8901f`
  - `--color-paper #faf9f6`, `--color-ink #1c2b26`
  - Neutrals from Tailwind `stone` (borders `stone-200/300`, muted text `ink/60`).
- **Type:** display/wordmark **Fraunces**; UI/body **Inter**. Set as `--font-display` and
  `--font-sans`. Type scale: page title `text-3xl` semibold display; section `text-lg`;
  body `text-sm`–`text-base`; labels `text-xs`–`text-sm` medium.
- **Shape & depth:** rounded (`rounded-lg`/`rounded-xl`), soft single-layer shadows
  (`shadow-sm`, hover `shadow-md`), hairline `stone` borders. Generous whitespace; airy, not dense.
- **Motif:** the doko (woven basket) appears only as a restrained texture on brand
  surfaces (e.g. faint crosshatch on the auth panel / sidebar footer). Never literal.
- **Accent discipline:** marigold is the single accent — primary buttons, active nav, focus
  rings. Pine is the brand/structure color. Everything else stays neutral.

## App shell

```
┌───────────┬─────────────────────────────────────────────┐
│  sidebar  │  top bar: page title · project chips · avatars │
│           ├─────────────────────────────────────────────┤
│  wordmark │                                             │
│  nav      │            page content                     │
│  …        │            (board, lists, …)                │
│  user     │                                             │
└───────────┴─────────────────────────────────────────────┘
```

- **Sidebar** (fixed, ~240px): wordmark "Doko" + marigold "Board"; nav groups — *Overview*
  (Dashboard, Board/Projects, Calendar) and *Tools* (Notifications, Inbox — placeholders ok);
  bottom: Settings + a user card (avatar, name, email) with a logout affordance. Active item
  gets a marigold indicator + pine text. Collapses to icons / a drawer on mobile.
- **Top bar:** page title (Fraunces), a row of project chips (each a small colored square +
  name; active chip has a pine outline), and an avatar cluster of members on the right.

## Board (kanban)

- **Columns** map to `status`: *Not started* (`TODO`), *On progress* (`IN_PROGRESS`),
  *On review* (`IN_REVIEW`), *Completed* (`DONE`). Each column header: a status dot, the
  label, and a count. Suggested dot colors — TODO `stone-400`, IN_PROGRESS `pine-700`,
  IN_REVIEW `marigold-500`, DONE `emerald-600`. Columns scroll horizontally on small screens.
- **Task card** (white, `rounded-xl`, `border-stone-200`, `shadow-sm`, hover lift):
  1. Top row: a **tag chip** (project or label) and a **priority chip**.
  2. **Title** (medium, ink) — one or two lines, truncate.
  3. **Due date** — "Due Mon, 12 Nov" via `Intl.DateTimeFormat` (never string-format dates).
  4. **Assignee avatars** — small overlapping circles from the member map; "+N" overflow.
  5. **Project/label chip** at the bottom with its colored square.
  (No progress bar — the backend has no progress field; omit it, don't invent one.)
- **Priority chip colors** (always paired with the text label, never color-only):
  `LOW` stone, `MEDIUM` marigold, `HIGH` orange-600, `URGENT` red-600.

## Shared components (`web/src/components/`)
Build these once and reuse: `Button` (primary pine, secondary outline, ghost; loading
state), `TextField`/`Select`/`Textarea` (labelled, error text, focus ring), `Chip`
(tag/priority/status variants), `Avatar` + `AvatarStack`, `Modal`/`Drawer`, `Card`,
`Skeleton`, `EmptyState` (icon + one-line prompt + action), `Toast`.

## States & copy
- **Empty:** every list/column has a designed empty state that invites the next action
  ("No tasks yet — create your first one").
- **Loading:** skeletons that match the final layout, not spinners over blank pages.
- **Error:** legible message from `ApiError.message`; offer a retry where sensible.
- **Copy:** sentence case, active voice, specific. Buttons name the action ("Create task",
  "Add member"), and the resulting toast uses the same verb ("Task created").

## Accessibility floor (required)
Labelled controls; visible keyboard focus (marigold ring); color never the only signal;
`prefers-reduced-motion` respected; modals trap focus and close on Esc; hit targets ≥ 40px.
