FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm install

COPY tsconfig.base.json ./
COPY packages/server packages/server
COPY packages/client packages/client

RUN npm run build:server
RUN npm run build:client

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/server/package.json packages/server/
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/client/dist packages/client/dist
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/packages/server/node_modules packages/server/node_modules

RUN mkdir -p storage/skills

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
