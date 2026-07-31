const express = require('express');
const BannerController = require('../../controllers/banner.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const { ROLE } = require('../../enums');

const router = express.Router();

router.get('/public', BannerController.getPublic);

router.use(protect);
router.use(authorize(ROLE.ADMIN));

router.route('/')
  .get(BannerController.getAll)
  .post(BannerController.create);

router.route('/:id')
  .put(BannerController.update)
  .delete(BannerController.delete);

module.exports = router;
