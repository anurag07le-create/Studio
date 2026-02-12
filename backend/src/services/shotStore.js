/**
 * shotStore.js — CRUD for shots table
 */
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

function createShot({ projectId, sceneId, shotNumber, prompt, description, shotStory, cameraAngle, cameraMovement, duration, mood, imageUrl, heroSubject, sortOrder }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO shots (id, projectId, sceneId, shotNumber, prompt, description, shotStory, cameraAngle, cameraMovement, duration, mood, imageUrl, heroSubject, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId, sceneId, shotNumber, prompt, description || null, shotStory || null,
    cameraAngle || null, cameraMovement || null, duration || 6, mood || null, imageUrl || null,
    heroSubject || null, sortOrder ?? 0, now);
  return getShot(id);
}

function batchCreateShots(projectId, sceneId, shotsData) {
  const insert = db.prepare(`
    INSERT INTO shots (id, projectId, sceneId, shotNumber, prompt, description, shotStory, cameraAngle, cameraMovement, duration, mood, imageUrl, heroSubject, sortOrder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const ids = [];

  const batchInsert = db.transaction((shots) => {
    for (const s of shots) {
      const id = uuidv4();
      ids.push(id);
      insert.run(id, projectId, sceneId, s.shotNumber, s.prompt, s.description || null, s.shotStory || null,
        s.cameraAngle || null, s.cameraMovement || null, s.duration || 6, s.mood || null, s.imageUrl || null,
        s.heroSubject || null, s.sortOrder ?? 0, now);
    }
  });

  batchInsert(shotsData);
  return listShotsByScene(projectId, sceneId);
}

function getShot(id) {
  return db.prepare('SELECT * FROM shots WHERE id = ?').get(id) || null;
}

function listShotsByScene(projectId, sceneId) {
  return db.prepare('SELECT * FROM shots WHERE projectId = ? AND sceneId = ? ORDER BY sortOrder ASC, shotNumber ASC').all(projectId, sceneId);
}

function listShotsByProject(projectId) {
  return db.prepare('SELECT * FROM shots WHERE projectId = ? ORDER BY sortOrder ASC, shotNumber ASC').all(projectId);
}

function updateShot(id, updates) {
  const existing = getShot(id);
  if (!existing) return null;

  const prompt = updates.prompt ?? existing.prompt;
  const description = updates.description ?? existing.description;
  const shotStory = updates.shotStory ?? existing.shotStory;
  const cameraAngle = updates.cameraAngle ?? existing.cameraAngle;
  const cameraMovement = updates.cameraMovement ?? existing.cameraMovement;
  const duration = updates.duration ?? existing.duration;
  const mood = updates.mood ?? existing.mood;
  const imageUrl = updates.imageUrl ?? existing.imageUrl;
  const heroSubject = updates.heroSubject ?? existing.heroSubject;
  const sortOrder = updates.sortOrder ?? existing.sortOrder;
  const cameraPresetId = updates.cameraPresetId ?? existing.cameraPresetId;
  const customCameraPrompt = updates.customCameraPrompt ?? existing.customCameraPrompt;

  db.prepare(`
    UPDATE shots SET prompt = ?, description = ?, shotStory = ?, cameraAngle = ?, cameraMovement = ?,
    duration = ?, mood = ?, imageUrl = ?, heroSubject = ?, sortOrder = ?,
    cameraPresetId = ?, customCameraPrompt = ?
    WHERE id = ?
  `).run(prompt, description, shotStory, cameraAngle, cameraMovement, duration, mood, imageUrl, heroSubject, sortOrder, cameraPresetId, customCameraPrompt, id);
  return getShot(id);
}

function reorderShots(sceneId, orderedIds) {
  if (sceneId) {
    const update = db.prepare('UPDATE shots SET sortOrder = ? WHERE id = ? AND sceneId = ?');
    const reorder = db.transaction((ids) => {
      ids.forEach((id, index) => {
        update.run(index, id, sceneId);
      });
    });
    reorder(orderedIds);
    return db.prepare('SELECT * FROM shots WHERE sceneId = ? ORDER BY sortOrder ASC').all(sceneId);
  } else {
    // Project-level reorder (no sceneId filter)
    const update = db.prepare('UPDATE shots SET sortOrder = ? WHERE id = ?');
    const reorder = db.transaction((ids) => {
      ids.forEach((id, index) => {
        update.run(index, id);
      });
    });
    reorder(orderedIds);
    return orderedIds.map(id => getShot(id)).filter(Boolean);
  }
}

function deleteShot(id) {
  db.prepare('DELETE FROM shots WHERE id = ?').run(id);
  return { deleted: true };
}

function deleteShotsByScene(sceneId) {
  db.prepare('DELETE FROM shots WHERE sceneId = ?').run(sceneId);
  return { deleted: true };
}

module.exports = { createShot, batchCreateShots, getShot, listShotsByScene, listShotsByProject, updateShot, reorderShots, deleteShot, deleteShotsByScene };
