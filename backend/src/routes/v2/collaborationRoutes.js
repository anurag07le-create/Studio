/**
 * collaborationRoutes.js — Collaboration management
 * Mounted at /api/v2/projects/:pid/collaborators
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('../../controllers/collaborationController');

router.get('/', c.listCollaborators);
router.post('/', c.inviteCollaborator);
router.put('/:collabId', c.updateRole);
router.delete('/:collabId', c.removeCollaborator);

module.exports = router;
