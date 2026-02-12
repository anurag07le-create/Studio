/**
 * assistantRoutes.js — AI writing assistant + camera presets
 * Mounted at /api/v2/projects/:pid/assistant
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('../../controllers/assistantController');

router.post('/write', c.startWriting);
router.post('/improve-dialogue', c.improveDialogueHandler);
router.post('/suggest-camera', c.suggestCamera);
router.get('/camera-presets', c.getCameraPresets);

module.exports = router;
