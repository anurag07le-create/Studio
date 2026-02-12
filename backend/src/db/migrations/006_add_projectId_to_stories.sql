-- Phase 1: Link existing stories to projects (optional)
-- Using a try-add pattern since ALTER TABLE ADD COLUMN IF NOT EXISTS isn't supported in SQLite
-- The migration runner handles errors gracefully
ALTER TABLE stories ADD COLUMN projectId TEXT;
