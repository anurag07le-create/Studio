-- Style lock: one per project, enforces visual style across all generated images
CREATE TABLE IF NOT EXISTS style_locks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL UNIQUE,
  styleName TEXT NOT NULL,
  stylePrompt TEXT NOT NULL,
  referenceImageUrl TEXT,
  extractedTraits TEXT, -- JSON: { palette, medium, lighting_style, texture, mood }
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
