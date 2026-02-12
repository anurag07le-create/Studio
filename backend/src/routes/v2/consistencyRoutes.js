/**
 * consistencyRoutes.js — Routes for character refs, location refs, style lock
 * Mounted at /api/v2/projects/:pid/consistency
 */
const express = require('express');
const multer = require('multer');
const router = express.Router({ mergeParams: true });
const c = require('../../controllers/consistencyController');

// Multer setup for character image uploads
const charImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, and WebP images are allowed'));
  },
});

// ── Characters ──────────────────────────────────────────────
router.get('/characters', c.listCharacters);
router.post('/characters', c.createCharacter);
router.get('/characters/:charId', c.getCharacter);
router.put('/characters/:charId', c.updateCharacter);
router.delete('/characters/:charId', c.deleteCharacter);
router.post('/characters/:charId/upload-image', charImageUpload.single('image'), c.uploadCharacterImage);
router.post('/characters/:charId/generate-ref-sheet', c.generateRefSheet);
router.post('/characters/extract', c.extractCharacter);
router.post('/generate-image', c.generateImageAdvanced);

// ── Batch Operations ────────────────────────────────────────
router.post('/batch-create', c.batchCreateFromSuggestions);

// ── Locations ───────────────────────────────────────────────
router.get('/locations', c.listLocations);
router.post('/locations', c.createLocation);
router.get('/locations/:locId', c.getLocation);
router.put('/locations/:locId', c.updateLocation);
router.delete('/locations/:locId', c.deleteLocation);

// ── Style Lock ──────────────────────────────────────────────
router.get('/style', c.getStyleLock);
router.post('/style', c.setStyleLock);
router.put('/style', c.updateStyleLock);
router.delete('/style', c.removeStyleLock);
router.post('/style/analyze', c.analyzeStyle);
router.get('/style/presets', c.getStylePresets);

module.exports = router;
