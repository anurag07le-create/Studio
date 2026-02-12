/**
 * exportRoutes.js — Export endpoints
 * Mounted at /api/v2/projects/:pid/export
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const c = require('../../controllers/exportController');

router.post('/pdf', c.exportPDF);
router.post('/png', c.exportPNG);
router.post('/json', c.exportJSON);
router.post('/import', c.importJSON);
router.get('/', c.listExports);
router.get('/:exportId/download', c.downloadExport);

module.exports = router;
