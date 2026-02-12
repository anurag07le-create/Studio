-- Location references for visual consistency
CREATE TABLE IF NOT EXISTS location_refs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  referenceImageUrl TEXT,
  traits TEXT, -- JSON: { architecture, lighting, color_palette, atmosphere, props }
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
