-- Phase 1: Scenes table
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  scriptId TEXT,
  sceneNumber INTEGER NOT NULL,
  heading TEXT,
  location TEXT,
  timeOfDay TEXT,
  description TEXT,
  dialogue TEXT,
  notes TEXT,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
