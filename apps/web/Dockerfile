FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config for pnpm to resolve workspace deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install all deps (workspace resolution requires root-level install)
RUN pnpm install --frozen-lockfile

# Build arg for Next.js public API URL (must be baked in at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js
RUN pnpm --filter web build

EXPOSE 3000

# Use pnpm to invoke the start script — it handles binary resolution correctly
CMD ["sh", "-c", "pnpm --filter web start"]
