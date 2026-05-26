const express = require('express');
const CategoryController = require('../../controllers/category.controller');

const router = express.Router();

router.get('/', CategoryController.getAll);
router.post('/', CategoryController.create);
router.get('/:id', CategoryController.getById);
router.put('/:id', CategoryController.update);
router.delete('/:id', CategoryController.remove);

module.exports = router;
