# syntax=docker/dockerfile:1
#
# DokoBoard web. A Vite build is just files, so the runtime image is nginx with
# no Node in it at all. See docs/DOCKER.md for the walkthrough.

# ----------------------------------------------------------------------------
# build
# ----------------------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The one thing to understand about this file.
#
# Vite does not read environment variables at runtime. It textually substitutes
# import.meta.env.VITE_* during the build, so the API URL is compiled into the
# JavaScript. That means:
#   - it is an ARG, not a runtime ENV
#   - staging and production need two different images, not one image with two
#     configs
#   - anything you put here is public, visible in the shipped bundle. Never an
#     API key or a secret.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ----------------------------------------------------------------------------
# runtime
# ----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# nginx's own PID and cache paths need to be writable by the unprivileged user.
RUN touch /var/run/nginx.pid \
 && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html

USER nginx
EXPOSE 8080

# "daemon off" keeps nginx in the foreground. A container whose main process
# forks into the background exits immediately.
CMD ["nginx", "-g", "daemon off;"]
