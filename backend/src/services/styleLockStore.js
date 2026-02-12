/**
 * styleLockStore.js — CRUD for style_locks table (one per project)
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const create = (data) => {
  // Remove existing style lock for this project (one per project)
  db.prepare('DELETE FROM style_locks WHERE projectId = ?').run(data.projectId);
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO style_locks (id, projectId, styleName, stylePrompt, referenceImageUrl, extractedTraits, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.projectId, data.styleName, data.stylePrompt,
    data.referenceImageUrl || null,
    data.extractedTraits ? JSON.stringify(data.extractedTraits) : null, now, now);
  return getById(id);
};

const getById = (id) => {
  const row = db.prepare('SELECT * FROM style_locks WHERE id = ?').get(id);
  return row ? _parse(row) : null;
};

const getByProject = (projectId) => {
  const row = db.prepare('SELECT * FROM style_locks WHERE projectId = ?').get(projectId);
  return row ? _parse(row) : null;
};

const update = (id, data) => {
  const existing = getById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updates = [];
  const values = [];
  if (data.styleName !== undefined) { updates.push('styleName = ?'); values.push(data.styleName); }
  if (data.stylePrompt !== undefined) { updates.push('stylePrompt = ?'); values.push(data.stylePrompt); }
  if (data.referenceImageUrl !== undefined) { updates.push('referenceImageUrl = ?'); values.push(data.referenceImageUrl); }
  if (data.extractedTraits !== undefined) { updates.push('extractedTraits = ?'); values.push(JSON.stringify(data.extractedTraits)); }
  updates.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.prepare(`UPDATE style_locks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getById(id);
};

const remove = (projectId) => {
  return db.prepare('DELETE FROM style_locks WHERE projectId = ?').run(projectId);
};

function _parse(row) {
  return {
    ...row,
    extractedTraits: row.extractedTraits ? JSON.parse(row.extractedTraits) : null,
  };
}

module.exports = { create, getById, getByProject, update, remove };
