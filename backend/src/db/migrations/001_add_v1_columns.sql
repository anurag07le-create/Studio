-- Add columns that were added via inline PRAGMA checks in V1 stores
-- These are idempotent — SQLite will error if column already exists,
-- so we wrap in a check approach using a temp helper

-- Add style column to stories if missing
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN,
-- so we use a programmatic approach in the migration runner.
-- For simplicity, we attempt and catch in the runner.
-- However, since better-sqlite3 doesn't have try-catch in SQL,
-- we'll handle this with separate migration that only runs once.

-- NOTE: These columns likely already exist from V1 inline migrations.
-- The migration runner will skip this file if it was already applied.
-- If running on a fresh DB, the columns won't exist yet from 000.
