# syntax=docker/dockerfile:1

# ---------- Build stage: compile the Vite frontend ----------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage: Express server + static dist ----------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server.ts ./

USER node
EXPOSE 3000

# Node 24 runs TypeScript directly via built-in type stripping
CMD ["node", "server.ts", "--prod"]
