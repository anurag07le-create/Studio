-- V1 baseline tables (already exist in production, CREATE IF NOT EXISTS for safety)

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  shotCount INTEGER NOT NULL,
  storyboard TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS video_logs (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL,
  storyboard TEXT,
  transitionPlans TEXT,
  clipResults TEXT,
  finalVideoUrl TEXT,
  errorMessage TEXT,
  duration INTEGER
);

CREATE TABLE IF NOT EXISTS storyboard_logs (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL,
  sentence TEXT,
  style TEXT,
  requestedShots INTEGER,
  generatedShots INTEGER,
  model TEXT,
  storyboard TEXT,
  errorMessage TEXT,
  duration INTEGER
);
