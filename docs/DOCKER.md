# Containerising DokoBoard

A walkthrough of the Dockerfiles in this repo, written to be read rather than
copied. Every non-obvious line exists because of something specific about *this*
app — a native module, a code generator, a build-time environment variable.

> **These have not been run.** Docker is not installed on the machine they were
> written on, so treat them as reviewed-but-unverified. The
> [Checking them](#checking-them) section is the first thing to do.

**Files:** [`api/Dockerfile`](../api/Dockerfile) ·
[`web/Dockerfile`](../web/Dockerfile) · [`web/nginx.conf`](../web/nginx.conf) ·
[`docker-compose.yml`](../docker-compose.yml) · the two `.dockerignore` files

---

## Why bother, when Render and Vercel do this already

Render and Vercel each run a buildpack: they detect Node, guess a build command,
and produce something runnable. That is genuinely easier — until you need to
answer "what exactly is running in production", or move somewhere that has no
opinion about Node.

A Dockerfile is that answer, written down. It is also the entry ticket to AWS
ECS, Google Cloud Run, Fly.io and Kubernetes, none of which will guess for you.

---

## The mental model

An image is a stack of read-only layers. Each instruction adds one. Two
consequences drive almost every decision below:

**Layers cache, in order.** Docker reuses a layer if that instruction and
everything before it are unchanged. Copy `package.json` and install *before*
copying source, and editing a component skips the install entirely. Copy
everything first and every keystroke reinstalls `node_modules`.

**Layers are permanent.** `RUN rm secret.txt` does not remove the secret — it
adds a layer where the file is absent, on top of a layer where it is present.
Anyone with the image can read it. Secrets go in the environment at runtime,
never into a build.

---

## The API image

### Why Debian, not Alpine

```dockerfile
FROM node:22-slim AS deps
```

Alpine is the reflex, and it is the wrong one here. `bcrypt` is a **native
addon** — C++ compiled against your platform. On glibc (Debian) it downloads a
prebuilt binary. On Alpine's musl there usually is not one, so it compiles from
source, which means installing `python3`, `make` and `g++`. The Alpine image
with a C toolchain in it is bigger than the slim one without.

`node:22-slim` is Debian with the cruft removed. Roughly 200 MB for the runtime
image here — perfectly reasonable.

> Check before switching a base image: is anything in `dependencies` native?
> `bcrypt`, `sharp`, `sqlite3`, `canvas` and Prisma's query engine all are.

### Why OpenSSL is installed explicitly

```dockerfile
RUN apt-get install -y --no-install-recommends openssl ca-certificates
```

Prisma's query engine is a compiled binary that links against OpenSSL. The slim
image does not include it, and Prisma fails at *startup*, not build — so it
passes CI and dies on deploy. `ca-certificates` is needed to verify the TLS
certificate on a managed database like Neon.

`rm -rf /var/lib/apt/lists/*` in the same `RUN` matters: a separate `RUN` would
leave the package index in the earlier layer, still in the image.

### Why the manifests are copied alone

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
```

This is the cache rule in practice. Dependencies change rarely, source changes
constantly. Split the copy and a source edit rebuilds in seconds.

`npm ci`, not `npm install`: it installs exactly the lockfile, fails if the two
disagree, and never silently upgrades. A build should be reproducible.

### Why `prisma generate` runs before `npm run build`

```dockerfile
RUN npx prisma generate
RUN npm run build
```

Prisma Client is generated code. It does not exist in the repo — it is written
into `node_modules/.prisma/client` from `schema.prisma`. `tsc` type-checks
against those generated types, so skipping this fails compilation with hundreds
of confusing errors about missing exports.

This is also why `.dockerignore` excludes `node_modules`: a client generated on
Windows contains a Windows query engine, and copying it into a Linux container
produces an executable the kernel cannot run.

### Why dependencies are installed twice

```dockerfile
FROM node:22-slim AS runtime
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
```

The final image starts from a clean base and takes only what it needs. The
TypeScript compiler, the Nest CLI, the Prisma CLI, Vitest — all of that built
the app and none of it should ship. Less to download, and a smaller attack
surface.

The generated Prisma client is the exception. It lives *inside* `node_modules`,
so the `--omit=dev` reinstall wipes it; copying it back from `build` is much
faster than generating it again.

> `npm prune --omit=dev` on the build stage is the alternative. It is simpler
> but keeps every earlier layer — including the toolchain — in the history.

### Why it does not run as root

```dockerfile
USER node
```

Containers run as root unless told otherwise. Root in a container is not root on
the host, but it is one kernel bug away, and it is free to avoid: the official
Node images ship a `node` user at uid 1000.

Note the ordering — `USER` comes after the `RUN` steps that need to write to
`/app`, and before `CMD`.

### Why the port comes from the environment

```dockerfile
CMD ["node", "dist/main"]
```

`api/src/main.ts` already does the right thing:

```ts
await app.listen(process.env.PORT ?? 3000);
```

Cloud Run, App Runner and Heroku all *assign* a port and expect you to read it.
Hardcoding 3000 means the platform's health check hits a closed socket.

Binding matters too. Nest with no host binds every interface, which is correct;
binding `127.0.0.1` would be reachable only from inside the container, and the
symptom is a service that looks healthy in logs and refuses every connection.

`EXPOSE` is documentation. It publishes nothing — `-p` does that.

---

## The web image

A Vite build is static files, so the runtime image has **no Node in it at all**
— just nginx serving a directory.

### The one thing to understand

```dockerfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
```

**Vite does not read environment variables at runtime.** It substitutes
`import.meta.env.VITE_*` textually during the build. By the time nginx serves
the bundle, the API URL is a string literal inside the JavaScript.

Three consequences:

1. It is an `ARG`, not a runtime `ENV`. Setting it with `docker run -e` does
   nothing at all.
2. **One image per environment.** Staging and production need separate builds.
   This is the biggest practical difference from the API image, which is built
   once and configured per environment.
3. **Anything you put there is public.** It ships in a file any visitor can
   read. Never an API key, never a secret.

If you need one image across environments, the usual trick is to fetch a
`/config.json` at startup instead of compiling the URL in. More moving parts;
worth it only when you actually have several environments.

### Why nginx listens on 8080

Ports below 1024 require root. The container runs as `nginx`, and Cloud Run and
App Runner expect a high port anyway.

### Why `try_files` is there

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

The exact same problem `web/vercel.json` solves. React Router owns
`/projects/<id>` in the browser; the server has never heard of it. On a refresh
nginx looks for that file, does not find it, and 404s — unless told to serve
`index.html` and let the router sort it out.

### Why caching is split

Hashed assets under `/assets/` get `immutable` for a year — the filename changes
when the content does, so a stale copy is impossible. `index.html` gets
`no-cache`, because it is the file that *points at* the hashed bundles. Cache
that and users are pinned to a build that no longer exists.

---

## The compose file

```bash
docker compose up --build
# web  → http://localhost:8080
# api  → http://localhost:3000/docs
```

Distinct from `api/docker-compose.yml`, which starts only Postgres for local
development. The root one runs the whole stack the way a server would — the
cheapest way to find out that an image does not actually work.

### Migrations are their own service

```yaml
migrate:
  build: { context: ./api, target: build }
  command: npx prisma migrate deploy
  depends_on:
    db: { condition: service_healthy }
```

Three things worth noticing.

**It is a separate step, not something the API does on boot.** Two API replicas
starting together would race to migrate the same database. Once migrations are
a discrete step, exactly one thing runs them.

**It builds `target: build`, not the runtime image.** `prisma migrate deploy`
needs the Prisma CLI and, because `prisma.config.ts` is TypeScript, a loader for
it. The lean runtime image has neither, on purpose. Multi-stage lets one
Dockerfile produce both.

**`service_healthy`, not just `depends_on`.** Plain `depends_on` waits for the
container to *start*, not for Postgres to accept connections — so the migration
races the database and usually loses. The `pg_isready` healthcheck is what makes
the wait mean something.

### The URL that trips everyone up

```yaml
web:
  build:
    args:
      VITE_API_URL: http://localhost:3000   # not http://api:3000
api:
  environment:
    CORS_ORIGIN: http://localhost:8080
```

Inside the compose network, services reach each other by name — `http://api:3000`
works from another container. But this URL is used by **the browser**, which is
on your machine, not in the network. It has no idea what `api` means.

Same logic for `CORS_ORIGIN`: the origin the browser reports is
`http://localhost:8080`.

---

## Checking them

Since these are unverified, start here:

```bash
# 1. Do they build?
docker build -t dokoboard-api ./api
docker build -t dokoboard-web --build-arg VITE_API_URL=http://localhost:3000 ./web

# 2. Does the whole stack come up?
docker compose up --build

# 3. Is the API alive?
curl http://localhost:3000/

# 4. Does the SPA fallback work? (must be 200, not 404)
curl -o /dev/null -w '%{http_code}\n' http://localhost:8080/projects/anything

# 5. How big did they get?
docker image ls dokoboard-api dokoboard-web
```

Most likely failure points, in order: the OpenSSL/Prisma engine pairing, the
`prisma generate` ordering, and nginx file permissions under `USER nginx`.

### Useful when it breaks

```bash
docker compose logs -f api          # follow one service
docker compose run --rm api sh      # shell into the runtime image
docker build --no-cache ./api       # rule out a stale layer
docker compose down -v              # reset, including the database volume
```

---

## What is deliberately missing

- **No `docker build` in CI.** Worth adding, but neither Vercel nor Render uses
  these images — they use buildpacks. These exist for portability and learning.
- **No image registry.** Needed the moment you deploy them anywhere; see
  [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md).
- **No secret management.** `JWT_SECRET` in the compose file is a local
  placeholder, and it says so. Real deployments read it from a secret store.
- **No multi-arch builds.** An image built on Apple Silicon is arm64 and will
  not run on an x86 host. `docker buildx build --platform linux/amd64,linux/arm64`
  when that day comes.

---

## Related

- [`DEPLOY_FREE.md`](./DEPLOY_FREE.md) — the no-cost path, which uses none of this
- [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md) — where these images actually get used
