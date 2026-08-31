# Build and production image using official lightweight oven/bun Alpine
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Copy monorepo manifests
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

# Install production dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY packages/shared packages/shared
COPY apps/server apps/server

WORKDIR /app/apps/server

# Expose Fastify port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/server.ts"]
