# 多階段構建 - Builder 階段
FROM node:18-alpine AS builder

# 安裝 pnpm
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# 安裝系統依賴
RUN apk add --no-cache libc6-compat openssl

# 複製相依性檔案
COPY package*.json pnpm-workspace.yaml ./
COPY apps/web/package*.json ./apps/web/
COPY packages ./packages/

# 安裝依賴項
RUN pnpm install --frozen-lockfile

# 複製所有原始碼
COPY apps/web ./apps/web/

# 設定工作目錄
WORKDIR /app/apps/web

# 生成 Prisma client
RUN pnpm db:generate

# 建置應用程式
RUN pnpm build

# 多階段構建 - Runner 階段
FROM node:18-alpine AS runner

# 安裝 pnpm
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# 安裝執行時依賴
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl \
    dumb-init

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製必要的檔案從 builder 階段
COPY --from=builder /app/apps/web/next.config.js ./
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/prisma ./prisma

# 複製構建結果
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# 切換到非 root 使用者
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 使用 dumb-init 作為 PID 1
ENTRYPOINT ["dumb-init", "--"]

# 啟動應用程式
CMD ["node", "server.js"]