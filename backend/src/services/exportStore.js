/**
 * exportStore.js — CRUD for exports table
 */
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

function createExport({ projectId, format, settings }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO exports (id, projectId, format, status, settings, createdAt)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(id, projectId, format, settings ? JSON.stringify(settings) : null, now);
  return getExport(id);
}

function getExport(id) {
  const row = db.prepare('SELECT * FROM exports WHERE id = ?').get(id);
  if (row && row.settings) row.settings = JSON.parse(row.settings);
  return row || null;
}

function listByProject(projectId) {
  const rows = db.prepare('SELECT * FROM exports WHERE projectId = ? ORDER BY createdAt DESC').all(projectId);
  return rows.map(r => {
    if (r.settings) r.settings = JSON.parse(r.settings);
    return r;
  });
}

function updateExport(id, updates) {
  const existing = getExport(id);
  if (!existing) return null;

  const status = updates.status ?? existing.status;
  const fileUrl = updates.fileUrl ?? existing.fileUrl;

  db.prepare('UPDATE exports SET status = ?, fileUrl = ? WHERE id = ?').run(status, fileUrl, id);
  return getExport(id);
}

function deleteExport(id) {
  db.prepare('DELETE FROM exports WHERE id = ?').run(id);
  return { deleted: true };
}

module.exports = { createExport, getExport, listByProject, updateExport, deleteExport };
