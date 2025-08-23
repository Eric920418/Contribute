#!/bin/bash

# 生產環境建置腳本
set -e

echo "🚀 開始生產環境建置..."

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 建置 Docker 映像
echo "📦 建置 Docker 映像..."
docker build -t conference-platform:latest .

# 檢查映像是否建置成功
if [ $? -eq 0 ]; then
    echo "✅ Docker 映像建置成功"
else
    echo "❌ Docker 映像建置失敗"
    exit 1
fi

# 啟動生產環境
echo "🏃 啟動生產環境..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 檢查服務狀態
echo "🔍 檢查服務狀態..."
docker-compose -f docker-compose.prod.yml ps

# 執行資料庫遷移
echo "📊 執行資料庫遷移..."
docker-compose -f docker-compose.prod.yml exec web pnpm db:push

echo "🎉 生產環境部署完成！"
echo "📍 應用程式已在 http://localhost:3000 運行"
echo "📍 MinIO 控制台: http://localhost:9001"
echo "📍 MailHog 控制台: http://localhost:8025"