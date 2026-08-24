# Deployment (free-tier stack)

Goal: host DokoBoard for free (with honest caveats) and keep a clear paid upgrade path.
Free-tier terms change often — re-check current limits before you rely on them.

## Recommended stack (as of mid-2026)

| Layer | Service | Why | Caveat |
|---|---|---|---|
| Frontend (`web/`) | **Vercel** or **Cloudflare Pages** | Genuinely free, no cold start, global CDN, deploy on git push | None material for a static SPA |
| Backend (`api/`) | **Render** free web service | Free, no card, connects a repo, no Dockerfile needed | Spins down after ~15 min idle → 30–50s cold start on the next request |
| Database | **Neon** (serverless Postgres) | Free, Prisma-friendly, scale-to-zero but **resumes instantly**, generous project limits | ~0.5 GB storage; brief resume on first query after idle |

Why Neon over Supabase here: Supabase free projects **pause after ~1 week of inactivity**
(a bad surprise for a low-traffic client app), while Neon resumes on the next query. If you
later want bundled auth/storage, Supabase is worth revisiting.

Alternative backend: **Google Cloud Run** (containerize `api/`, scale-to-zero, generous free
tier) if you'd rather run a container than a Render web service.

## The cold-start reality (be honest with the client)
On the free stack, the **first** request after idle wakes both the Render service and the
Neon compute, so it can take ~30–60s; every request after that is fast. Fine for a demo or
light internal use. To remove it: Render Starter (~$7/mo) keeps the API always-on; Neon's
paid tier removes compute suspension. See the pricing note below.

## Environment variables
- **Backend (`api/`):** `DATABASE_URL` (Neon connection string, pooled), `JWT_SECRET`
  (strong random value — never commit it), `CORS_ORIGIN` (the deployed frontend URL, e.g.
  `https://dokoboard.vercel.app`), `PORT` (host-provided).
- **Frontend (`web/`):** `VITE_API_URL` (the deployed API URL, e.g.
  `https://dokoboard-api.onrender.com`).

## Steps
1. **Database:** create a Neon project, copy the pooled `DATABASE_URL`. Run
   `npx prisma migrate deploy` against it (locally or in the backend's build step).
2. **Backend:** new Render web service from the repo, root dir `api/`, build
   `npm install && npm run build`, start `node dist/main.js` (confirm the built entrypoint).
   Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, then deploy.
3. **Frontend:** import the repo on Vercel/Cloudflare Pages, root dir `web/`, framework Vite,
   build `npm run build`, output `dist`. Set `VITE_API_URL`. Deploy.
4. **CORS:** set the backend's `CORS_ORIGIN` to the exact frontend origin. Bearer tokens go
   in a header (not cookies), so `credentials: true` is not required.
5. **Smoke test in prod:** register → dashboard → create project → create task → move task →
   refresh (stays signed in) → logout.

## Notes
- Never commit `.env`. Set secrets in each host's dashboard.
- Run DB migrations with `prisma migrate deploy` (not `dev`) in deployed environments.
- If you add CI later (GitHub Actions), gate deploys on build + lint + tests passing.
