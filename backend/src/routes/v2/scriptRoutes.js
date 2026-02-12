const router = require('express').Router({ mergeParams: true });
const multer = require('multer');
const ctrl = require('../../controllers/scriptController');

// Store files in memory for parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.fdx', '.fountain', '.ftn', '.txt', '.text'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExts.join(', ')}`));
    }
  },
});

router.post('/', upload.single('script'), ctrl.uploadScript);
router.get('/', ctrl.getScript);
router.delete('/', ctrl.deleteScript);
router.post('/suggest-entities', ctrl.suggestEntities);
router.post('/generate', ctrl.generateScript);
router.post('/save-text', ctrl.saveScriptText);

module.exports = router;
