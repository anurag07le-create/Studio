const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/imageController');

// POST /api/v2/image/generate — Generate standalone image with Flux
router.post('/generate', ctrl.generateStandalone);

module.exports = router;
