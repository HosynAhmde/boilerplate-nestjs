# syntax=docker/dockerfile:1.7
# Build from the repo root: docker build -f apps/api/Dockerfile .
# NODE_IMAGE / NPM_REGISTRY can point at a mirror on servers inside Iran.
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS base
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN npm config set registry ${NPM_REGISTRY} && npm i -g pnpm@10.28.0 && pnpm config set registry ${NPM_REGISTRY}
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter api...
COPY apps/api apps/api
RUN pnpm --filter api build \
 && pnpm --filter api deploy --prod --legacy /out

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production TZ=UTC
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
RUN mkdir -p /app/storage && chown -R node:node /app/storage
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health/live || exit 1
# Migrations run as a separate one-off step (see `make migrate` / deploy.sh).
CMD ["node", "dist/main.js"]
