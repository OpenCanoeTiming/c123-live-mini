# syntax=docker/dockerfile:1
# Multi-stage production image: npm workspaces build + Node runtime.
#
# Build (requires GitHub Packages read token for @czechcanoe/rvp-design-system):
#   docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t c123-live-mini .
#
# Run:
#   docker run --rm -p 3000:3000 -e NODE_ENV=production c123-live-mini

FROM node:20-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json .npmrc tsconfig.base.json vitest.workspace.ts ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Append short-lived auth line for npm ci; strip it before copying .npmrc to the runtime stage.
RUN --mount=type=secret,id=npm_token \
  bash -ce 'TOKEN=$(tr -d "\n\r" < /run/secrets/npm_token); \
    printf "//npm.pkg.github.com/:_authToken=%s\n" "$TOKEN" >> .npmrc && \
    npm ci && \
    sed -i "/npm.pkg.github.com\\/:_authToken/d" .npmrc'

COPY packages ./packages

RUN npm run build

RUN npm prune --omit=dev

# ---

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Drop TypeScript sources; keep package.json and dist/ for each workspace package.
RUN rm -rf packages/shared/src packages/server/src packages/client/src

RUN groupadd --gid 1001 appuser \
  && useradd --uid 1001 --gid appuser --shell /usr/sbin/nologin --create-home appuser \
  && mkdir -p /app/data \
  && chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
