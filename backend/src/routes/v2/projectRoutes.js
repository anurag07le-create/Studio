const router = require('express').Router();
const ctrl = require('../../controllers/projectController');

router.post('/', ctrl.createProject);
router.get('/', ctrl.listProjects);
router.get('/:id', ctrl.getProject);
router.put('/:id', ctrl.updateProject);
router.delete('/:id', ctrl.deleteProject);

module.exports = router;
