/**
 * sceneCharacterStore.js — CRUD for scene↔character and scene↔location junction tables
 * Handles auto-mapping, manual overrides, and queries
 */
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

// ─── Scene-Character Operations ────────────────────────────────

/**
 * Link a character to a scene
 */
function linkCharacterToScene(sceneId, characterRefId, source = 'auto') {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO scene_characters (id, sceneId, characterRefId, source, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  const id = uuidv4();
  stmt.run(id, sceneId, characterRefId, source, new Date().toISOString());
  return { id, sceneId, characterRefId, source };
}

/**
 * Unlink a character from a scene
 */
function unlinkCharacterFromScene(sceneId, characterRefId) {
  const stmt = db.prepare('DELETE FROM scene_characters WHERE sceneId = ? AND characterRefId = ?');
  stmt.run(sceneId, characterRefId);
}

/**
 * List all characters for a scene (joined with character_refs for full data)
 */
function listCharactersByScene(sceneId) {
  const stmt = db.prepare(`
    SELECT cr.id, cr.name, cr.description, cr.referenceImageUrl, cr.uploadedImageUrl, cr.traits,
           sc.source as mappingSource
    FROM scene_characters sc
    JOIN character_refs cr ON cr.id = sc.characterRefId
    WHERE sc.sceneId = ?
    ORDER BY cr.name
  `);
  const rows = stmt.all(sceneId);
  return rows.map(r => ({
    ...r,
    traits: r.traits ? JSON.parse(r.traits) : {},
  }));
}

/**
 * List all scenes where a character appears
 */
function listScenesByCharacter(characterRefId) {
  const stmt = db.prepare(`
    SELECT s.id, s.sceneNumber, s.heading, s.location, s.timeOfDay,
           sc.source as mappingSource
    FROM scene_characters sc
    JOIN scenes s ON s.id = sc.sceneId
    WHERE sc.characterRefId = ?
    ORDER BY s.sortOrder, s.sceneNumber
  `);
  return stmt.all(characterRefId);
}

/**
 * Bulk link characters to a scene (in a transaction)
 */
function bulkLinkCharactersToScene(sceneId, characterRefIds, source = 'auto') {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO scene_characters (id, sceneId, characterRefId, source, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  const insertMany = db.transaction((ids) => {
    for (const charId of ids) {
      stmt.run(uuidv4(), sceneId, charId, source, now);
    }
  });
  insertMany(characterRefIds);
}

/**
 * Auto-map characters to scenes based on name matching in dialogue/description.
 * Clears existing auto-mappings first, then creates new ones.
 */
function autoMapCharactersToScenes(projectId) {
  // Load all scenes
  const sceneStmt = db.prepare('SELECT id, description, dialogue FROM scenes WHERE projectId = ? ORDER BY sortOrder');
  const scenes = sceneStmt.all(projectId);

  // Load all character refs
  const charStmt = db.prepare('SELECT id, name FROM character_refs WHERE projectId = ?');
  const characters = charStmt.all(projectId);

  if (scenes.length === 0 || characters.length === 0) return { mapped: 0 };

  // Clear existing auto-mappings for this project's scenes
  const clearStmt = db.prepare(`
    DELETE FROM scene_characters
    WHERE source = 'auto' AND sceneId IN (SELECT id FROM scenes WHERE projectId = ?)
  `);
  clearStmt.run(projectId);

  // Insert new mappings
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO scene_characters (id, sceneId, characterRefId, source, createdAt)
    VALUES (?, ?, ?, 'auto', ?)
  `);
  const now = new Date().toISOString();
  let mapped = 0;

  const mapAll = db.transaction(() => {
    for (const scene of scenes) {
      const sceneText = ((scene.description || '') + '\n' + (scene.dialogue || '')).toUpperCase();
      for (const char of characters) {
        // Match character name in scene text (case-insensitive)
        const nameUpper = char.name.toUpperCase();
        if (sceneText.includes(nameUpper)) {
          insertStmt.run(uuidv4(), scene.id, char.id, now);
          mapped++;
        }
      }
    }
  });
  mapAll();

  return { mapped };
}

/**
 * Auto-map locations to scenes based on location name matching.
 */
function autoMapLocationsToScenes(projectId) {
  const sceneStmt = db.prepare('SELECT id, location FROM scenes WHERE projectId = ? ORDER BY sortOrder');
  const scenes = sceneStmt.all(projectId);

  const locStmt = db.prepare('SELECT id, name FROM location_refs WHERE projectId = ?');
  const locations = locStmt.all(projectId);

  if (scenes.length === 0 || locations.length === 0) return { mapped: 0 };

  // Clear existing auto-mappings
  const clearStmt = db.prepare(`
    DELETE FROM scene_locations
    WHERE source = 'auto' AND sceneId IN (SELECT id FROM scenes WHERE projectId = ?)
  `);
  clearStmt.run(projectId);

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO scene_locations (id, sceneId, locationRefId, source, createdAt)
    VALUES (?, ?, ?, 'auto', ?)
  `);
  const now = new Date().toISOString();
  let mapped = 0;

  const mapAll = db.transaction(() => {
    for (const scene of scenes) {
      const sceneLocation = (scene.location || '').toUpperCase().trim();
      if (!sceneLocation) continue;

      for (const loc of locations) {
        const locName = (loc.name || '').toUpperCase().trim();
        // Match if scene location contains the location ref name or vice versa
        if (sceneLocation.includes(locName) || locName.includes(sceneLocation)) {
          insertStmt.run(uuidv4(), scene.id, loc.id, now);
          mapped++;
        }
      }
    }
  });
  mapAll();

  return { mapped };
}

/**
 * Clear all auto-mappings for a project
 */
function clearAutoMappings(projectId) {
  const clearChars = db.prepare(`
    DELETE FROM scene_characters
    WHERE source = 'auto' AND sceneId IN (SELECT id FROM scenes WHERE projectId = ?)
  `);
  const clearLocs = db.prepare(`
    DELETE FROM scene_locations
    WHERE source = 'auto' AND sceneId IN (SELECT id FROM scenes WHERE projectId = ?)
  `);
  clearChars.run(projectId);
  clearLocs.run(projectId);
}

// ─── Scene-Location Operations ────────────────────────────────

function linkLocationToScene(sceneId, locationRefId, source = 'auto') {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO scene_locations (id, sceneId, locationRefId, source, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  const id = uuidv4();
  stmt.run(id, sceneId, locationRefId, source, new Date().toISOString());
  return { id, sceneId, locationRefId, source };
}

function unlinkLocationFromScene(sceneId, locationRefId) {
  const stmt = db.prepare('DELETE FROM scene_locations WHERE sceneId = ? AND locationRefId = ?');
  stmt.run(sceneId, locationRefId);
}

function listLocationsByScene(sceneId) {
  const stmt = db.prepare(`
    SELECT lr.id, lr.name, lr.description, lr.referenceImageUrl, lr.traits,
           sl.source as mappingSource
    FROM scene_locations sl
    JOIN location_refs lr ON lr.id = sl.locationRefId
    WHERE sl.sceneId = ?
    ORDER BY lr.name
  `);
  const rows = stmt.all(sceneId);
  return rows.map(r => ({
    ...r,
    traits: r.traits ? JSON.parse(r.traits) : {},
  }));
}

module.exports = {
  linkCharacterToScene,
  unlinkCharacterFromScene,
  listCharactersByScene,
  listScenesByCharacter,
  bulkLinkCharactersToScene,
  autoMapCharactersToScenes,
  autoMapLocationsToScenes,
  clearAutoMappings,
  linkLocationToScene,
  unlinkLocationFromScene,
  listLocationsByScene,
};
