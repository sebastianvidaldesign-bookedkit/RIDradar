FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config for pnpm to resolve workspace deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install all deps (workspace resolution requires root-level install)
RUN pnpm install --frozen-lockfile

# Generate Prisma client BEFORE tsc (types must exist before compilation)
RUN cd apps/api && npx prisma generate

# Build the API
RUN pnpm --filter api build

WORKDIR /app/apps/api

EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
