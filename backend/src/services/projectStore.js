/**
 * projectStore.js — CRUD for projects table
 */
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

function createProject({ title, description, style, settings }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, title, description, createdAt, updatedAt, status, style, settings)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)
  `).run(id, title, description || null, now, now, style || null, settings ? JSON.stringify(settings) : null);
  return getProject(id);
}

function getProject(id) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    settings: row.settings ? JSON.parse(row.settings) : null,
  };
}

function listProjects() {
  const rows = db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC').all();
  return rows.map((row) => ({
    ...row,
    settings: row.settings ? JSON.parse(row.settings) : null,
  }));
}

function updateProject(id, updates) {
  const existing = getProject(id);
  if (!existing) return null;

  const title = updates.title ?? existing.title;
  const description = updates.description ?? existing.description;
  const status = updates.status ?? existing.status;
  const style = updates.style ?? existing.style;
  const settings = updates.settings !== undefined
    ? JSON.stringify(updates.settings)
    : (existing.settings ? JSON.stringify(existing.settings) : null);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE projects SET title = ?, description = ?, status = ?, style = ?, settings = ?, updatedAt = ?
    WHERE id = ?
  `).run(title, description, status, style, settings, now, id);
  return getProject(id);
}

function deleteProject(id) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return { deleted: true };
}

module.exports = { createProject, getProject, listProjects, updateProject, deleteProject };
