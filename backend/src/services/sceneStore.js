/**
 * sceneStore.js — CRUD for scenes table
 */
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

function createScene({ projectId, scriptId, sceneNumber, heading, location, timeOfDay, description, dialogue, notes, sortOrder }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO scenes (id, projectId, scriptId, sceneNumber, heading, location, timeOfDay, description, dialogue, notes, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId, scriptId || null, sceneNumber, heading || null, location || null, timeOfDay || null,
    description || null, dialogue || null, notes || null, sortOrder ?? 0, now);
  return getScene(id);
}

function batchCreateScenes(projectId, scriptId, scenesData) {
  const insert = db.prepare(`
    INSERT INTO scenes (id, projectId, scriptId, sceneNumber, heading, location, timeOfDay, description, dialogue, notes, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const ids = [];

  const batchInsert = db.transaction((scenes) => {
    for (const s of scenes) {
      const id = uuidv4();
      ids.push(id);
      insert.run(id, projectId, scriptId || null, s.sceneNumber, s.heading || null, s.location || null,
        s.timeOfDay || null, s.description || null, s.dialogue || null, s.notes || null, s.sortOrder ?? 0, now);
    }
  });

  batchInsert(scenesData);
  return listScenesByProject(projectId);
}

function getScene(id) {
  return db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) || null;
}

function listScenesByProject(projectId) {
  return db.prepare('SELECT * FROM scenes WHERE projectId = ? ORDER BY sortOrder ASC, sceneNumber ASC').all(projectId);
}

function updateScene(id, updates) {
  const existing = getScene(id);
  if (!existing) return null;

  const heading = updates.heading ?? existing.heading;
  const location = updates.location ?? existing.location;
  const timeOfDay = updates.timeOfDay ?? existing.timeOfDay;
  const description = updates.description ?? existing.description;
  const dialogue = updates.dialogue ?? existing.dialogue;
  const notes = updates.notes ?? existing.notes;
  const sortOrder = updates.sortOrder ?? existing.sortOrder;

  db.prepare(`
    UPDATE scenes SET heading = ?, location = ?, timeOfDay = ?, description = ?, dialogue = ?, notes = ?, sortOrder = ?
    WHERE id = ?
  `).run(heading, location, timeOfDay, description, dialogue, notes, sortOrder, id);
  return getScene(id);
}

function reorderScenes(projectId, orderedIds) {
  const update = db.prepare('UPDATE scenes SET sortOrder = ? WHERE id = ? AND projectId = ?');
  const reorder = db.transaction((ids) => {
    ids.forEach((id, index) => {
      update.run(index, id, projectId);
    });
  });
  reorder(orderedIds);
  return listScenesByProject(projectId);
}

function deleteScene(id) {
  // Also delete shots belonging to this scene
  db.prepare('DELETE FROM shots WHERE sceneId = ?').run(id);
  db.prepare('DELETE FROM scenes WHERE id = ?').run(id);
  return { deleted: true };
}

function deleteScenesByProject(projectId) {
  db.prepare('DELETE FROM shots WHERE projectId = ?').run(projectId);
  db.prepare('DELETE FROM scenes WHERE projectId = ?').run(projectId);
  return { deleted: true };
}

module.exports = { createScene, batchCreateScenes, getScene, listScenesByProject, updateScene, reorderScenes, deleteScene, deleteScenesByProject };
