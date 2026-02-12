-- Phase 1: Shots table
CREATE TABLE IF NOT EXISTS shots (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  sceneId TEXT NOT NULL,
  shotNumber INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  shotStory TEXT,
  cameraAngle TEXT,
  cameraMovement TEXT,
  duration INTEGER DEFAULT 6,
  mood TEXT,
  imageUrl TEXT,
  heroSubject TEXT,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (sceneId) REFERENCES scenes(id) ON DELETE CASCADE
);
