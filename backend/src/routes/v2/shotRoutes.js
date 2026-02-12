const router = require('express').Router({ mergeParams: true });
const ctrl = require('../../controllers/shotController');

// Shots for a specific scene
router.get('/', ctrl.listShots);
router.get('/:id', ctrl.getShot);
router.put('/:id', ctrl.updateShot);
router.delete('/:id', ctrl.deleteShot);
router.post('/:id/generate-image', ctrl.generateImage);

// Batch operations at the project or scene level
router.put('/reorder', ctrl.reorderShots);
router.post('/generate-all-images', ctrl.generateAllImages);

// Video generation
router.post('/generate-video', ctrl.generateVideo);

module.exports = router;
