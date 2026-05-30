FROM node:26.2.0

WORKDIR /app

RUN npm install -g pnpm@11.5.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

ENV PORT 3000
EXPOSE 3000

CMD ["pnpm", "start"]
