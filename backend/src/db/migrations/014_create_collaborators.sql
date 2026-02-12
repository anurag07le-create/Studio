-- Phase 4: Collaboration
CREATE TABLE IF NOT EXISTS collaborators (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invitedAt TEXT NOT NULL,
  acceptedAt TEXT,
  UNIQUE(projectId, email),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
