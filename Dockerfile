
FROM node:22-alpine AS base


RUN apk add --no-cache libc6-compat


RUN corepack enable

WORKDIR /app



FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./


RUN pnpm install --frozen-lockfile



FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .


ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL


ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build



FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app


USER node

# The standalone server, with the slice of node_modules it actually needs.
COPY --from=build --chown=node:node /app/.next/standalone ./


COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

EXPOSE 3000


CMD ["node", "server.js"]
