-- AWS RDS PostgreSQL データベース完全リセットスクリプト
-- このスクリプトはすべてのテーブルを削除し、マイグレーションをゼロからやり直します

-- 警告: このスクリプトは破壊的です。実行前に必ずバックアップを取ってください。

-- Step 1: すべてのテーブルを削除
DO $$ DECLARE
    r RECORD;
BEGIN
    -- すべてのテーブルを検索してDROP
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Step 2: すべてのシーケンスを削除
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END $$;

-- 確認用クエリ（実行後にテーブルが0件になることを確認）
SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public';
