#!/bin/bash
set -e

# 建立額外的資料庫 (如果需要測試資料庫)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 建立測試資料庫
    CREATE DATABASE conference_platform_test;
    
    -- 建立開發資料庫的擴充功能
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "unaccent";
    
    -- 為測試資料庫也建立相同的擴充功能
    \c conference_platform_test;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "unaccent";
EOSQL

echo "資料庫初始化完成"