const express = require('express');
const ToppingController = require('../../controllers/topping.controller');

const router = express.Router();

router.route('/')
  .get(ToppingController.getAll)
  .post(ToppingController.create);

router.route('/:id')
  .get(ToppingController.getById)
  .put(ToppingController.update)
  .delete(ToppingController.delete);

module.exports = router;
