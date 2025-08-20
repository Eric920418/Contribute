.PHONY: help dev up down logs clean build test migrate seed

# 預設目標
help: ## 顯示可用的命令
	@echo "可用的命令："
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# 開發環境
dev: ## 啟動開發環境 (僅基礎服務)
	docker compose -f docker-compose.dev.yml up -d
	@echo "開發環境已啟動！"
	@echo "PostgreSQL: localhost:5432"
	@echo "MinIO: http://localhost:9001 (minioadmin/minioadmin)"
	@echo "MailHog: http://localhost:8025"
	@echo "Redis: localhost:6379"

up: ## 啟動完整環境
	docker compose up -d
	@echo "完整環境已啟動！"
	@echo "應用程式: http://localhost:3000"
	@echo "MinIO: http://localhost:9001"
	@echo "MailHog: http://localhost:8025"

down: ## 停止環境
	docker compose down
	docker compose -f docker-compose.dev.yml down

logs: ## 查看日誌
	docker compose logs -f

logs-web: ## 查看 Web 應用日誌
	docker compose logs -f web

logs-db: ## 查看資料庫日誌
	docker compose logs -f postgres

clean: ## 清理所有容器和資料卷
	docker compose down -v --remove-orphans
	docker compose -f docker-compose.dev.yml down -v --remove-orphans
	docker system prune -f

build: ## 重新建置映像檔
	docker compose build --no-cache

# 資料庫操作
migrate: ## 執行資料庫遷移
	cd apps/web && pnpm db:migrate

push: ## 推送資料庫 schema
	cd apps/web && pnpm db:push

seed: ## 執行資料庫種子資料
	cd apps/web && pnpm db:seed

generate: ## 生成 Prisma client
	cd apps/web && pnpm db:generate

# 開發工具
install: ## 安裝依賴項
	pnpm install

lint: ## 執行程式碼檢查
	cd apps/web && pnpm lint

format: ## 格式化程式碼
	cd apps/web && pnpm format

type-check: ## 執行型別檢查
	cd apps/web && pnpm type-check

test: ## 執行測試
	cd apps/web && pnpm test

# 部署
deploy-staging: ## 部署到測試環境
	@echo "部署到測試環境..."
	# 這裡添加測試環境部署腳本

deploy-prod: ## 部署到生產環境
	@echo "部署到生產環境..."
	# 這裡添加生產環境部署腳本

# 監控和維護
backup: ## 備份資料庫
	@echo "備份資料庫..."
	docker exec conference_postgres pg_dump -U postgres conference_platform > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore: ## 還原資料庫 (需要指定 FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "請指定備份檔案：make restore FILE=backup.sql"; \
	else \
		echo "還原資料庫：$(FILE)"; \
		docker exec -i conference_postgres psql -U postgres -d conference_platform < $(FILE); \
	fi

health: ## 檢查服務健康狀態
	@echo "檢查服務狀態..."
	@docker compose ps
	@echo ""
	@curl -f http://localhost:3000/api/health 2>/dev/null && echo "✅ Web 服務正常" || echo "❌ Web 服務異常"
	@curl -f http://localhost:9000/minio/health/live 2>/dev/null && echo "✅ MinIO 服務正常" || echo "❌ MinIO 服務異常"