-- Scene-Character junction table: tracks which characters appear in which scenes
CREATE TABLE IF NOT EXISTS scene_characters (
  id TEXT PRIMARY KEY,
  sceneId TEXT NOT NULL,
  characterRefId TEXT NOT NULL,
  source TEXT DEFAULT 'auto',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (sceneId) REFERENCES scenes(id) ON DELETE CASCADE,
  FOREIGN KEY (characterRefId) REFERENCES character_refs(id) ON DELETE CASCADE,
  UNIQUE(sceneId, characterRefId)
);

-- Scene-Location junction table: tracks which locations are used in which scenes
CREATE TABLE IF NOT EXISTS scene_locations (
  id TEXT PRIMARY KEY,
  sceneId TEXT NOT NULL,
  locationRefId TEXT NOT NULL,
  source TEXT DEFAULT 'auto',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (sceneId) REFERENCES scenes(id) ON DELETE CASCADE,
  FOREIGN KEY (locationRefId) REFERENCES location_refs(id) ON DELETE CASCADE,
  UNIQUE(sceneId, locationRefId)
);
