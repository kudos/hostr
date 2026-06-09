# Builder: full dependencies + frontend build. Also used for CI tests
# (the test suite runs inside this stage, where devDependencies exist).
FROM node:26.3.0 AS builder
WORKDIR /app
RUN npm install -g pnpm@11.5.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Runtime: slim base, production dependencies only, plus the built assets
# copied from the builder. This is the image that gets deployed.
FROM node:26.3.0-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@11.5.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY . .
COPY --from=builder /app/web/public/build ./web/public/build
COPY --from=builder /app/web/public/styles ./web/public/styles

ENV PORT=3000
EXPOSE 3000

CMD ["pnpm", "start"]
