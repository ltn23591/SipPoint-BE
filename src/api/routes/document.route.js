const express = require('express');
const multer = require('multer');
const DocumentController = require('../../controllers/document.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-file', protect, upload.single('file'), DocumentController.uploadFile);
router.post('/upload-multiple-file', protect, upload.array('files', 10), DocumentController.uploadMultipleFile);
router.delete('/delete-file', protect, DocumentController.deleteFile);

module.exports = router;
