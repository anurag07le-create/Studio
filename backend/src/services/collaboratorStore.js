/**
 * collaboratorStore.js — CRUD for collaborators table
 */
const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

function inviteCollaborator(projectId, email, role = 'viewer') {
  const id = uuidv4();
  const now = new Date().toISOString();
  try {
    db.prepare(`
      INSERT INTO collaborators (id, projectId, email, role, invitedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, email, role, now);
    return getCollaborator(id);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      // Update role if already invited
      db.prepare('UPDATE collaborators SET role = ? WHERE projectId = ? AND email = ?').run(role, projectId, email);
      return getByEmail(projectId, email);
    }
    throw err;
  }
}

function getCollaborator(id) {
  return db.prepare('SELECT * FROM collaborators WHERE id = ?').get(id) || null;
}

function getByEmail(projectId, email) {
  return db.prepare('SELECT * FROM collaborators WHERE projectId = ? AND email = ?').get(projectId, email) || null;
}

function listByProject(projectId) {
  return db.prepare('SELECT * FROM collaborators WHERE projectId = ? ORDER BY invitedAt DESC').all(projectId);
}

function updateRole(id, role) {
  db.prepare('UPDATE collaborators SET role = ? WHERE id = ?').run(role, id);
  return getCollaborator(id);
}

function acceptInvite(id) {
  const now = new Date().toISOString();
  db.prepare('UPDATE collaborators SET acceptedAt = ? WHERE id = ?').run(now, id);
  return getCollaborator(id);
}

function removeCollaborator(id) {
  db.prepare('DELETE FROM collaborators WHERE id = ?').run(id);
  return { deleted: true };
}

module.exports = { inviteCollaborator, getCollaborator, getByEmail, listByProject, updateRole, acceptInvite, removeCollaborator };
