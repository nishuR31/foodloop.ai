# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

# Install OpenSSL required by Prisma engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Install deps and copy prisma schemas so postinstall can generate client
COPY package.json bun.lock* ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma clients for both schemas
RUN bunx prisma generate --schema=prisma/schema.prisma && bunx prisma generate --schema=prisma/audit.prisma

# Compile TypeScript → dist/
RUN bun run build

# ─── Stage 2: Runner (minimal image) ─────────────────────────────────────────
FROM oven/bun:1-alpine AS runner

# Install OpenSSL runtime required by Prisma engine on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Only bring in runtime artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Expose Fastify port
EXPOSE 3001

# Non-root user for security
USER bun

CMD ["bun", "run", "start"]
