# Dockerfile para AppBailes - Next.js con Prisma
# Prisma 6.19.0 funciona con Node.js 18+, 20+, o 22+
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV WHATSAPP_ACCESS_TOKEN="build_token"
ENV WHATSAPP_PHONE_NUMBER_ID="123456789012345"
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyAkJA2y7VQLc7S_ioTeAmVzxnZaNfkoPcM"

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy prisma schema and migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy production start script
COPY --from=builder --chown=nextjs:nodejs /app/scripts/start-production.sh ./start-production.sh

# Install prisma CLI in production
RUN npm install prisma @prisma/client --legacy-peer-deps

# Generate Prisma Client with correct permissions
RUN npx prisma generate

# Fix permissions for Prisma client
RUN chown -R nextjs:nodejs /app/node_modules/.prisma

# Make script executable
RUN chmod +x ./start-production.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# Use custom start script that handles migrations
CMD ["./start-production.sh"] 