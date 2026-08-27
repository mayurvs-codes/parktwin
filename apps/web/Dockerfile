# syntax=docker/dockerfile:1

# ===========================================================================
# ParkTwin AI — Production frontend (apps/web, Next.js 15 App Router)
# ---------------------------------------------------------------------------
# Multi-stage build. The application code is unchanged; only the runtime
# packaging differs from a local `npm run dev` / `npm run build`.
#
# IMPORTANT — build-time configuration
# -------------------------------------
# The frontend reads its backend base URL from NEXT_PUBLIC_API_BASE, which is
# inlined at BUILD time (Next.js requirement). In production the frontend and
# the backend are served from the SAME origin behind the reverse proxy, with the
# API exposed under the `/api` prefix (the proxy strips `/api` and forwards to
# the backend). Using the same-origin `/api` prefix means:
#   - HTTP calls  → https://<domain>/api/integration/...
#   - WebSocket   → wss://<domain>/api/integration/ws  (wsBaseUrl swaps http→ws)
#   - No CORS, no mixed content, no route clash with frontend pages (/analytics,
#     /reports, /vehicles, /parking).
# Override at build with:
#   docker compose build --build-arg NEXT_PUBLIC_API_BASE=https://your.domain/api
# ===========================================================================

# ---- Dependencies ---------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
# Use the lockfile so the install is reproducible. `npm install` (not `ci`)
# is used so a minor lockfile/registry drift (e.g. a republished transitive
# patch such as @emnapi/*) reconciles instead of aborting the build. The
# application code deployed is identical; only the dependency install tolerates
# drift. To enforce a byte-exact lock, regenerate package-lock.json and switch
# back to `npm ci`.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# ---- Builder ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runner ----------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# `next start` needs the build output, public assets, the (TS) config and the
# production dependencies.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts

# Run as a dedicated non-root user.
RUN addgroup -S nodejs \
    && adduser -S nextjs -G nodejs \
    && chown -R nextjs:nodejs /app
USER nextjs

# Health check: a real SPA route returns HTTP 200 (HTML). Node 20 has global fetch.
# (/ redirects to /dashboard, so we probe /dashboard directly to avoid redirect semantics.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/dashboard').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 3000

# Bind explicitly to all interfaces so the proxy can reach the container.
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
