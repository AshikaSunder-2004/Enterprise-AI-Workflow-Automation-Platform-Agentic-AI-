FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN addgroup -S aiwf && adduser -S aiwf -G aiwf
COPY --from=builder --chown=aiwf:aiwf /app/package*.json ./
COPY --from=builder --chown=aiwf:aiwf /app/node_modules ./node_modules
COPY --from=builder --chown=aiwf:aiwf /app/dist ./dist
COPY --from=builder --chown=aiwf:aiwf /app/prisma ./prisma
RUN mkdir -p logs && chown aiwf:aiwf logs
USER aiwf
EXPOSE 4000
CMD sh -c "npx prisma migrate deploy && node dist/api/server.js"
