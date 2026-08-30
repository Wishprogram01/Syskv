# ---------- Build stage ----------
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run db:generate
RUN bun run build

# ---------- Runtime stage ----------
FROM oven/bun:1
WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock prisma.config.ts ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/prisma ./prisma
RUN bun run db:generate

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src

EXPOSE 3001
CMD ["sh", "-c", "bun run db:push && bun run start"]