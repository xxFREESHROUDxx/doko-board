# syntax=docker/dockerfile:1
#
# DokoBoard API. Multi-stage: the toolchain that builds the app never ships.
# See docs/DOCKER.md for a line-by-line walkthrough of why it is shaped this way.

# ----------------------------------------------------------------------------
# deps — install node_modules once, cached on the lockfile alone
# ----------------------------------------------------------------------------
# Debian slim, not Alpine. `bcrypt` is a native addon: on glibc it downloads a
# prebuilt binary, on Alpine's musl it usually has to compile, which means
# shipping python3 and a C toolchain. The slim image is bigger; the Alpine one
# with build tools is bigger still.
FROM node:22-slim AS deps
WORKDIR /app

# Prisma's query engine links against OpenSSL and will not start without it.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Only the manifests, so this layer is reused on every build where the
# dependencies have not changed — which is most of them.
COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------------------------------------------------------
# build — compile TypeScript and generate the Prisma client
# ----------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

COPY prisma ./prisma
COPY prisma.config.ts nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

# Generates into node_modules/@prisma/client. Must run before tsc, which
# type-checks against the generated types.
RUN npx prisma generate
RUN npm run build

# ----------------------------------------------------------------------------
# runtime — production dependencies and compiled output, nothing else
# ----------------------------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Reinstalled rather than copied from `deps`: --omit=dev drops the compiler,
# the Prisma CLI and the test tooling, which have no business in production.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# The generated client lives inside node_modules, so it has to come back after
# that reinstall. Copying it is much faster than generating again.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/dist ./dist

# `node` (uid 1000) ships with the image. A container that does not need root
# should not run as root.
USER node

EXPOSE 3000

# Nest reads process.env.PORT and binds every interface, which is what a
# container needs — binding 127.0.0.1 would be unreachable from outside it.
CMD ["node", "dist/main"]
