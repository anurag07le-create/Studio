-- Character references for visual consistency
CREATE TABLE IF NOT EXISTS character_refs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  referenceImageUrl TEXT,
  traits TEXT, -- JSON: { hair, skin, clothing, distinguishing_features, age_range, build }
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
