const { body, param } = require('express-validator');

// Validate cấp field cơ bản khi tạo trò chơi. Nghiệp vụ ô/phân bổ được kiểm ở service.
const createGame = [
  body('name')
    .notEmpty().withMessage('Tên trò chơi là bắt buộc')
    .isLength({ min: 2, max: 200 }).withMessage('Tên trò chơi từ 2-200 ký tự')
    .trim(),
  body('endDate')
    .notEmpty().withMessage('Ngày kết thúc là bắt buộc')
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('defaultTurnCount')
    .optional()
    .isInt({ min: 0 }).withMessage('Số lượt khởi tạo phải là số nguyên không âm'),
  body('appliedSegmentIds')
    .optional()
    .isArray().withMessage('Danh sách nhóm khách hàng áp dụng phải là mảng'),
  body('rewards')
    .isArray({ min: 1 }).withMessage('Trò chơi phải có ít nhất một ô thưởng'),
];

// Update: các field đều optional (chỉ khi DRAFT service mới cho sửa)
const updateGame = [
  param('id').isMongoId().withMessage('ID trò chơi không hợp lệ'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 200 }).withMessage('Tên trò chơi từ 2-200 ký tự')
    .trim(),
  body('endDate')
    .optional()
    .isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('defaultTurnCount')
    .optional()
    .isInt({ min: 0 }).withMessage('Số lượt khởi tạo phải là số nguyên không âm'),
  body('appliedSegmentIds')
    .optional()
    .isArray().withMessage('Danh sách nhóm khách hàng áp dụng phải là mảng'),
  body('rewards')
    .optional()
    .isArray({ min: 1 }).withMessage('Danh sách ô thưởng phải là mảng có ít nhất một phần tử'),
];

const gameId = [
  param('id').isMongoId().withMessage('ID trò chơi không hợp lệ'),
];

const winnerRewards = [
  param('id').isMongoId().withMessage('ID trò chơi không hợp lệ'),
  param('customerId').isMongoId().withMessage('ID khách hàng không hợp lệ'),
];

const grantBonusTurns = [
  param('id').isMongoId().withMessage('ID trò chơi không hợp lệ'),
  body('customerId').isMongoId().withMessage('ID khách hàng không hợp lệ'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('Số lượt cấp phải là số nguyên dương'),
];

module.exports = {
  createGame,
  updateGame,
  gameId,
  winnerRewards,
  grantBonusTurns,
};
