const express = require('express');
const router = express.Router();

// V2 API root
router.get('/', (req, res) => {
  res.json({
    version: '2.0',
    status: 'ok',
    message: 'Pucho StoryGen API v2',
  });
});

// Phase 1: Project-based routes
router.use('/projects', require('./projectRoutes'));
router.use('/projects/:pid/script', require('./scriptRoutes'));
router.use('/projects/:pid/scenes', require('./sceneRoutes'));
router.use('/projects/:pid/shots', require('./shotRoutes'));
router.use('/projects/:pid/scenes/:sceneId/shots', require('./shotRoutes'));

// Phase 2: Consistency engine routes
router.use('/projects/:pid/consistency', require('./consistencyRoutes'));

// Phase 3: Assistant + camera presets
router.use('/projects/:pid/assistant', require('./assistantRoutes'));

// Phase 4: Export & collaboration
router.use('/projects/:pid/export', require('./exportRoutes'));
router.use('/projects/:pid/collaborators', require('./collaborationRoutes'));

// Standalone video generation (not project-based)
router.use('/video', require('./videoRoutes'));

// Standalone image generation (Flux via PiAPI)
router.use('/image', require('./imageRoutes'));

module.exports = router;
