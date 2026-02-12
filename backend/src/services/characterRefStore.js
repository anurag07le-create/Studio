/**
 * characterRefStore.js — CRUD for character_refs table
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const create = (data) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO character_refs (id, projectId, name, description, referenceImageUrl, traits, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.projectId, data.name, data.description || null, data.referenceImageUrl || null,
    data.traits ? JSON.stringify(data.traits) : null, now, now);
  return getById(id);
};

const getById = (id) => {
  const row = db.prepare('SELECT * FROM character_refs WHERE id = ?').get(id);
  return row ? _parse(row) : null;
};

const listByProject = (projectId) => {
  const rows = db.prepare('SELECT * FROM character_refs WHERE projectId = ? ORDER BY createdAt ASC').all(projectId);
  return rows.map(_parse);
};

const update = (id, data) => {
  const existing = getById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updates = [];
  const values = [];
  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.referenceImageUrl !== undefined) { updates.push('referenceImageUrl = ?'); values.push(data.referenceImageUrl); }
  if (data.uploadedImageUrl !== undefined) { updates.push('uploadedImageUrl = ?'); values.push(data.uploadedImageUrl); }
  if (data.traits !== undefined) { updates.push('traits = ?'); values.push(JSON.stringify(data.traits)); }
  updates.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.prepare(`UPDATE character_refs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  return getById(id);
};

const remove = (id) => {
  return db.prepare('DELETE FROM character_refs WHERE id = ?').run(id);
};

const removeByProject = (projectId) => {
  return db.prepare('DELETE FROM character_refs WHERE projectId = ?').run(projectId);
};

function _parse(row) {
  return {
    ...row,
    traits: row.traits ? JSON.parse(row.traits) : null,
  };
}

module.exports = { create, getById, listByProject, update, remove, removeByProject };
