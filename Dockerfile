# ------------------------------------------------------------------ base
# One place to fix the Node version and the package manager, so the three
# stages below cannot drift apart.
FROM node:22-alpine AS base

# Alpine ships musl rather than glibc, and a few of Next's prebuilt binaries
# expect glibc symbols. This shim provides them; without it the build fails
# with errors about missing shared objects that name no obvious culprit.
RUN apk add --no-cache libc6-compat

# corepack reads "packageManager": "pnpm@11.9.0" from package.json and uses
# exactly that version - so the image installs with the same pnpm you do,
# rather than whichever happens to be newest.
RUN corepack enable

WORKDIR /app


# ------------------------------------------------------------------ deps
# Dependencies alone, so this layer is reused until the lockfile changes.
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --frozen-lockfile installs exactly what the lockfile says and fails if
# package.json disagrees. Without it a build can quietly resolve newer versions
# than the ones you tested, and the image stops being a reproduction.
RUN pnpm install --frozen-lockfile


# ------------------------------------------------------------------ build
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Where the browser should send its API calls.
#
# This has to be a build argument, not a runtime variable, and that catches
# people out. Anything named NEXT_PUBLIC_* is substituted into the JavaScript
# during the build and shipped to the browser as a literal string. Setting it in
# docker-compose at run time changes nothing - the value is already baked into
# the bundle the browser downloaded.
#
# It is also a URL the BROWSER resolves, not the container. So it is the address
# the API is published on for a person's machine, not a compose service name.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Telemetry off. It phones Vercel during builds, which is noise in CI and a
# request leaving the network in production.
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build


# ---------------------------------------------------------------- runtime
# No pnpm, no source, no dev dependencies - just the traced server.
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Without this the server binds to localhost, which inside a container
    # means "reachable from nowhere". The single most common reason a
    # containerised Next app starts cleanly and answers nothing.
    HOSTNAME=0.0.0.0

WORKDIR /app

# The node image already has an unprivileged "node" user at uid 1000.
# Containers run as root otherwise, so any flaw that runs code runs it as root.
USER node

# The standalone server, with the slice of node_modules it actually needs.
COPY --from=build --chown=node:node /app/.next/standalone ./

# Standalone deliberately leaves these two out, because in a large deployment a
# CDN would serve them. We have no CDN, so the server serves them - and it only
# does that if they are in these exact places.
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

EXPOSE 3000

# server.js is written by the standalone build. Not "next start" - next is not
# installed in this image.
CMD ["node", "server.js"]
