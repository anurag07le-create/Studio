-- Phase 1: Scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  filename TEXT,
  format TEXT NOT NULL,
  rawContent TEXT,
  parsedContent TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
