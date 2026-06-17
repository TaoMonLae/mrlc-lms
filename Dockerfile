# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

# openssl + ca-certificates are required by Prisma's engines.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install ALL deps (dev deps are needed for vite/esbuild/tailwind/tsc).
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build the client bundle + server bundle.
COPY . .
RUN npx prisma generate \
  && npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Bring over the full install (prisma CLI + tsx are needed at start-up for
# `migrate deploy` and optional seeding) plus the build output and prisma files.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
