# Deploying DokoBoard for free

A step-by-step walkthrough for getting this monorepo online at no cost, from a
GitHub repository, with no credit card.

**Stack:** Vercel (frontend) · Render (API) · Neon (Postgres).

> Checked August 2026. Free tiers change often — re-read each provider's
> current pricing page before you rely on any number here.

---

## Why not Railway

Railway used to be the obvious pick and no longer is. The permanent free tier
was removed in **August 2024**. What is left is a one-time **$5 trial credit**;
when that runs out or 30 days pass, whichever comes first, your services are
**paused** until you move to Hobby ($5/mo) or Pro ($20/mo).

Render kept a real free tier, so this guide uses Render. If you would rather
pay $5/mo for a service that never sleeps, Railway is a perfectly good choice —
it is just not a free one.

## What "free" actually costs you

| Layer | Service | Free allowance | The catch |
|---|---|---|---|
| Frontend | **Vercel** Hobby | 100 GB transfer, 6,000 build-min/mo, 1 concurrent build | **Non-commercial only.** Client work, ads or payments need Pro ($20/mo) |
| API | **Render** free web service | 512 MB RAM, 0.1 CPU, 750 instance-hours/mo | **Sleeps after 15 min idle**; next request takes 30–60 s |
| Database | **Neon** free | 0.5 GB storage, 100 CU-hours/mo, autoscale to 2 CU | Scales to zero after 5 min idle (resumes in ~1 s). 0.5 GB is a hard stop |

Two consequences worth being honest with yourself — and any client — about:

- **The first visit after a quiet period takes up to a minute.** Render has to
  wake the container and Neon has to resume compute. Every request after that
  is fast. Fine for a demo or a portfolio piece; not fine for real users.
- **Vercel Hobby is licensed for non-commercial use.** If DokoBoard becomes
  client work or earns money, you need Pro.

Removing the cold start costs about **$7/mo** (Render Starter). That is the
single highest-value upgrade; do it before anything else.

---

## Before you start

- The repo pushed to GitHub, `main` green.
- Accounts on [neon.tech](https://neon.tech), [render.com](https://render.com)
  and [vercel.com](https://vercel.com) — all three sign in with GitHub.
- Nothing to install locally.

### The ordering problem

Two settings depend on each other:

- the API needs `CORS_ORIGIN` — the frontend's URL
- the frontend needs `VITE_API_URL` — the API's URL

Neither exists until the other is deployed. Resolve it by going
**database → API → frontend → back to the API to set CORS**. Step 4 is not
optional; skip it and every request from the browser fails.

---

## Step 1 — Database (Neon)

1. **New Project.** Name `dokoboard`, Postgres 16 or newer, region closest to
   where you will put the API (`US West (Oregon)` pairs with Render's Oregon).
2. Copy the **pooled** connection string from the dashboard. It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.us-west-2.aws.neon.tech/dokoboard?sslmode=require
   ```

   Pooled, not direct: Render's free instance is small and Postgres connections
   are expensive. The pooler holds them so your app does not have to.

3. Keep it somewhere safe for the next step. **Never commit it** — it contains
   the password.

Nothing else to do here. The schema is created in step 2, by the migration that
already lives in `api/prisma/migrations/`.

---

## Step 2 — API (Render)

Render can read `render.yaml` from the repo root, or you can click through the
dashboard. Both are described; pick one.

### Option A — Blueprint (uses the committed `render.yaml`)

1. **New → Blueprint**, pick the repository.
2. Render finds `render.yaml` and proposes **dokoboard-api**.
3. It prompts for the two secrets marked `sync: false`:
   - `DATABASE_URL` → the Neon string from step 1
   - `CORS_ORIGIN` → `http://localhost:5173` **for now** (fixed in step 4)
4. Apply. `JWT_SECRET` is generated for you.

### Option B — Manual

**New → Web Service**, connect the repository, then:

| Setting | Value |
|---|---|
| Root Directory | `api` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build` |
| Start Command | `node dist/main` |
| Instance Type | Free |
| Health Check Path | `/` |

Environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon pooled string |
| `JWT_SECRET` | click **Generate** |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `http://localhost:5173` for now |
| `NODE_VERSION` | `22` |

### Two things in that build command that are easy to get wrong

**`--include=dev`.** Render sets `NODE_ENV=production` for Node services, and
under that `npm ci` skips `devDependencies` — which is exactly where the Prisma
CLI, TypeScript and the Nest CLI live. Without the flag the build dies on
`prisma: not found`, which looks like a missing dependency rather than a flag.

**Migrations run in the build, not at startup.** The start command runs again on
every restart and every cold start; two instances waking together would race to
migrate the same database. `prisma migrate deploy` only applies what is pending,
so running it on each deploy is safe and idempotent.

### Verify

Deploy takes a few minutes. Then:

- `https://<your-api>.onrender.com/` → a hello response
- `https://<your-api>.onrender.com/docs` → Swagger

If Swagger loads, the app booted and reached Postgres. **Copy the base URL.**

---

## Step 3 — Frontend (Vercel)

**Add New → Project**, import the repository, then — and this is the part that
matters for a monorepo:

| Setting | Value | Why |
|---|---|---|
| **Root Directory** | `web` | Without it Vercel builds the repo root, finds no `package.json`, and fails |
| Framework Preset | Vite | Detected once Root Directory is set |
| Build Command | `npm run build` | default |
| Output Directory | `dist` | default for Vite |
| Install Command | `npm install` | default |

Environment variable:

| Key | Value | Environments |
|---|---|---|
| `VITE_API_URL` | `https://<your-api>.onrender.com` | Production, Preview, Development |

No trailing slash — the client builds URLs as `${BASE_URL}/projects`, so a
trailing slash produces `//projects`.

Deploy, and note the URL (`https://dokoboard.vercel.app` or similar).

### Things already handled for you

- **`web/vercel.json`** rewrites every path to `index.html`. Without it,
  refreshing on `/projects/<id>` asks Vercel for a file that does not exist and
  returns 404. It is committed; you do not need to add it.
- **`VITE_API_URL` is compiled in, not read at runtime.** Vite substitutes
  `import.meta.env.*` textually during the build. Changing it in the dashboard
  does nothing until you **redeploy**. It is also public — visible in the
  shipped bundle — so it must never hold a secret.

### Optional: stop rebuilding the frontend for backend commits

Every push to `main` triggers a Vercel build, even one that only touched `api/`.
In **Settings → Git → Ignored Build Step**:

```bash
git diff --quiet HEAD^ HEAD -- .
```

Vercel runs this from the Root Directory, so it means "skip unless something
under `web/` changed". Saves your 6,000 monthly build-minutes.

---

## Step 4 — Close the CORS loop

Back in Render → your service → **Environment**:

```
CORS_ORIGIN = https://dokoboard.vercel.app
```

The **exact** origin: scheme, host, no trailing slash, no path. Save; Render
redeploys.

This is the step people skip. The API reads it in `api/src/main.ts`:

```ts
app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' });
```

Get it wrong and the app loads but every request fails with a CORS error in the
console — which looks like the API being down, and is not.

Auth uses a bearer token in a header, not cookies, so `credentials: true` is not
needed.

---

## Step 5 — Smoke test production

Open the Vercel URL and walk the real path. **The first request will take up to
a minute** while Render and Neon wake — that is expected, once.

1. Register a new account
2. Land on the dashboard
3. Create a project
4. Create a task, set a priority and a due date
5. Drag it to another column, reload — it stayed
6. Open Members, change your own profile picture
7. Reload the board URL directly — no 404 *(this is the `vercel.json` rewrite)*
8. Log out and back in — the session survives

If step 7 404s, Root Directory is wrong or `vercel.json` was not picked up. If
anything between 3 and 6 fails with a network error, re-read step 4.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Render build: `prisma: not found` | `--include=dev` missing from the build command |
| Render build: `Cannot find module 'dotenv'` | `api/prisma.config.ts` imports it; it is a declared devDependency, so this again means dev deps were skipped |
| Render: `P1001: Can't reach database server` | Wrong `DATABASE_URL`, or `?sslmode=require` dropped |
| Vercel: `No package.json found` | Root Directory is not `web` |
| App loads, every request fails, console says CORS | `CORS_ORIGIN` missing, misspelled, or has a trailing slash |
| Requests go to `localhost:3000` in production | `VITE_API_URL` was set but the project was not redeployed — it is baked in at build time |
| 404 on refresh, fine when navigating in-app | SPA rewrite not applied |
| First load takes ~1 minute | Normal on the free tier. Render Starter (~$7/mo) removes it |
| Neon suspended | 0.5 GB storage or 100 CU-hours exhausted |

---

## Before this is a real product

The free stack is a demo stack. Ordered by how much each matters:

1. **Render Starter (~$7/mo)** — removes the cold start. Highest value per dollar.
2. **Vercel Pro ($20/mo)** — required the moment this is commercial.
3. **Back up the database.** Neon's free tier has limited history; a nightly
   `pg_dump` somewhere else costs nothing.
4. **Rotate `JWT_SECRET` out of any environment it has leaked into.** Changing
   it invalidates every issued token, which is the point.
5. **Add CI** so `npm run build`, `npm run lint` and `npm run test` gate a
   deploy. Both platforms deploy whatever is on `main`, passing or not.

---

## Related

- [`DOCKER.md`](./DOCKER.md) — containerising both apps, and why each line is there
- [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md) — what the same stack looks like on AWS
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — the original, shorter stack notes
