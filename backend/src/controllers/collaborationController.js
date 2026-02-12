/**
 * collaborationController.js — Collaborator management
 */
const collaboratorStore = require('../services/collaboratorStore');

exports.listCollaborators = (req, res) => {
  try {
    const collaborators = collaboratorStore.listByProject(req.params.pid);
    res.json(collaborators);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.inviteCollaborator = (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    if (role && !['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be viewer, editor, or admin' });
    }

    const collaborator = collaboratorStore.inviteCollaborator(req.params.pid, email, role || 'viewer');
    res.json(collaborator);
  } catch (err) {
    console.error('Error inviting collaborator:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateRole = (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be viewer, editor, or admin' });
    }

    const collaborator = collaboratorStore.updateRole(req.params.collabId, role);
    if (!collaborator) return res.status(404).json({ error: 'Collaborator not found' });
    res.json(collaborator);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeCollaborator = (req, res) => {
  try {
    collaboratorStore.removeCollaborator(req.params.collabId);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
