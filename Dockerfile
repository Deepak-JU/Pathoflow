# Stage 1: Build Frontend Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN cp prisma/schema.mongodb.prisma prisma/schema.prisma
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV CLIENT_DIST_PATH=/app/client/dist

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl netcat-openbsd

# Copy server production artifacts
WORKDIR /app/server
COPY server/package*.json ./
# Install production dependencies plus prisma CLI for engine generation & db push
RUN npm ci

COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=client-builder /app/client/dist /app/client/dist

# Ensure MongoDB schema is in place and generate engine specifically for this runtime
RUN cp prisma/schema.mongodb.prisma prisma/schema.prisma
RUN npx prisma generate

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
