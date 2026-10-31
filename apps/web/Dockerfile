# syntax=docker/dockerfile:1.7
# Build from the repo root: docker build -f apps/web/Dockerfile .
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN npm config set registry ${NPM_REGISTRY} && npm i -g pnpm@10.28.0 && pnpm config set registry ${NPM_REGISTRY}
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter web...
COPY apps/web apps/web
RUN pnpm --filter web build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
