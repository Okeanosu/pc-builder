# Build context: repository root.  docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY tools/graph/package.json tools/graph/
RUN pnpm install --frozen-lockfile --filter @pc/api...
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @pc/api deploy --legacy --prod /out

FROM node:22-alpine
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /out /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["sh", "-c", "node --import tsx src/db/migrate.ts && exec node --import tsx src/server.ts"]
