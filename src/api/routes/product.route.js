const express = require('express');
const upload = require('../../middleware/multer')
const ProductController = require('../../controllers/product.controller');

const router = express.Router();

router.get('/', ProductController.getAll);
router.post('/', upload.any(), ProductController.create);
router.get('/:id', ProductController.getById);
router.put('/:id', upload.any(), ProductController.update);
router.delete('/:id', ProductController.remove);

module.exports = router;
