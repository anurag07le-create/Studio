const router = require('express').Router({ mergeParams: true });
const ctrl = require('../../controllers/sceneController');

router.get('/', ctrl.listScenes);
router.post('/', ctrl.createScene);
router.put('/reorder', ctrl.reorderScenes);
router.post('/auto-map-characters', ctrl.autoMapCharacters);
router.get('/:id', ctrl.getScene);
router.put('/:id', ctrl.updateScene);
router.delete('/:id', ctrl.deleteScene);
router.post('/:id/generate-shots', ctrl.generateShots);
router.get('/:id/characters', ctrl.listSceneCharacters);
router.post('/:id/characters', ctrl.addSceneCharacter);
router.delete('/:id/characters/:charId', ctrl.removeSceneCharacter);

module.exports = router;
