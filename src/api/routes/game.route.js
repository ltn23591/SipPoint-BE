const express = require('express');
const GameController = require('../../controllers/game.controller');
const { protect } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/authorize.middleware');
const validate = require('../../middleware/validate');
const gameValidation = require('../../validations/game.validation');
const { ROLE } = require('../../enums');

const router = express.Router();

// ── Khách hàng ──
// (khai báo các route tĩnh/khách trước /:id để route động không nuốt mất)
router.get('/available', protect, GameController.getAvailable);
router.get('/me/rewards', protect, GameController.getMyRewards);
router.get('/:id/detail', protect, gameValidation.gameId, validate, GameController.getDetailForCustomer);
router.get('/:id/turns', protect, gameValidation.gameId, validate, GameController.getMyTurns);
router.post('/:id/draw', protect, gameValidation.gameId, validate, GameController.draw);

// ── Admin: CRUD Trò chơi may mắn ──
// (draw thêm ở các bước sau.)
router.route('/')
  .get(protect, authorize(ROLE.ADMIN), GameController.getAll)
  .post(protect, authorize(ROLE.ADMIN), gameValidation.createGame, validate, GameController.create);

router.route('/:id')
  .get(protect, authorize(ROLE.ADMIN), gameValidation.gameId, validate, GameController.getById)
  .put(protect, authorize(ROLE.ADMIN), gameValidation.updateGame, validate, GameController.update)
  .delete(protect, authorize(ROLE.ADMIN), gameValidation.gameId, validate, GameController.remove);

// Chuyển trạng thái
router.patch('/:id/publish', protect, authorize(ROLE.ADMIN), gameValidation.gameId, validate, GameController.publish);
router.patch('/:id/pause', protect, authorize(ROLE.ADMIN), gameValidation.gameId, validate, GameController.pause);
router.patch('/:id/resume', protect, authorize(ROLE.ADMIN), gameValidation.gameId, validate, GameController.resume);
router.patch('/:id/cancel', protect, authorize(ROLE.ADMIN), gameValidation.gameId, validate, GameController.cancel);

// Admin: danh sách trúng thưởng của một trò chơi
router.get('/:id/winners', protect, authorize(ROLE.ADMIN), gameValidation.gameId, validate, GameController.getWinners);
// Admin: chi tiết phần thưởng của 1 khách trong trò chơi
router.get('/:id/winners/:customerId', protect, authorize(ROLE.ADMIN), gameValidation.winnerRewards, validate, GameController.getWinnerRewards);

// Admin: cấp thêm lượt cho một khách
router.post('/:id/bonus-turn', protect, authorize(ROLE.ADMIN), gameValidation.grantBonusTurns, validate, GameController.grantBonusTurns);

module.exports = router;
