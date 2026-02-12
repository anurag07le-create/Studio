/**
 * videoRoutes.js — Standalone video generation routes
 */
const router = require('express').Router();
const ctrl = require('../../controllers/videoController');

// POST /api/v2/video/generate — Generate a standalone video clip
router.post('/generate', ctrl.generateStandalone);

module.exports = router;
