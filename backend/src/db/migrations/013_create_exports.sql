-- Phase 4: Export tracking
CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fileUrl TEXT,
  settings TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
