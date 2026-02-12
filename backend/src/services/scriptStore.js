/**
 * scriptStore.js — CRUD for scripts table
 */
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

function createScript({ projectId, filename, format, rawContent, parsedContent }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO scripts (id, projectId, filename, format, rawContent, parsedContent, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId, filename || null, format, rawContent || null, JSON.stringify(parsedContent), now, now);
  return getScript(id);
}

function getScript(id) {
  const row = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    parsedContent: JSON.parse(row.parsedContent),
  };
}

function getScriptByProject(projectId) {
  const row = db.prepare('SELECT * FROM scripts WHERE projectId = ? ORDER BY createdAt DESC LIMIT 1').get(projectId);
  if (!row) return null;
  return {
    ...row,
    parsedContent: JSON.parse(row.parsedContent),
  };
}

function deleteScript(id) {
  db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
  return { deleted: true };
}

function deleteScriptsByProject(projectId) {
  db.prepare('DELETE FROM scripts WHERE projectId = ?').run(projectId);
  return { deleted: true };
}

module.exports = { createScript, getScript, getScriptByProject, deleteScript, deleteScriptsByProject };
