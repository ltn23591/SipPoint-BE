const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const GameService = require('../services/game.service');

// Chỉ khách hàng (không có roleId) mới được thao tác chơi
const requireCustomer = (req) => {
  if (!req.user || req.user.roleId) {
    throw new AppError('Chỉ khách hàng mới có thể thực hiện thao tác này', 403);
  }
};

class GameController {
  // ── Admin ──
  static create = catchAsync(async (req, res) => {
    const createdById = req.user ? req.user._id : null;
    const data = await GameService.createGame(req.body, createdById);
    res.status(201).json({
      success: true,
      message: 'Tạo trò chơi thành công',
      data,
    });
  });

  static getAll = catchAsync(async (req, res) => {
    const result = await GameService.getAllGames(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách trò chơi thành công',
      data: result.games,
      pagination: result.pagination,
    });
  });

  static getById = catchAsync(async (req, res) => {
    const data = await GameService.getGameById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết trò chơi thành công',
      data,
    });
  });

  static update = catchAsync(async (req, res) => {
    const updatedById = req.user ? req.user._id : null;
    const data = await GameService.updateGame(req.params.id, req.body, updatedById);
    res.status(200).json({
      success: true,
      message: 'Cập nhật trò chơi thành công',
      data,
    });
  });

  static remove = catchAsync(async (req, res) => {
    const data = await GameService.deleteGame(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Xóa trò chơi thành công',
      data,
    });
  });

  static publish = catchAsync(async (req, res) => {
    const updatedById = req.user ? req.user._id : null;
    const data = await GameService.publishGame(req.params.id, updatedById);
    res.status(200).json({
      success: true,
      message: 'Xuất bản trò chơi thành công',
      data,
    });
  });

  static pause = catchAsync(async (req, res) => {
    const updatedById = req.user ? req.user._id : null;
    const data = await GameService.pauseGame(req.params.id, updatedById);
    res.status(200).json({
      success: true,
      message: 'Tạm dừng trò chơi thành công',
      data,
    });
  });

  static resume = catchAsync(async (req, res) => {
    const updatedById = req.user ? req.user._id : null;
    const data = await GameService.resumeGame(req.params.id, updatedById);
    res.status(200).json({
      success: true,
      message: 'Mở lại trò chơi thành công',
      data,
    });
  });

  static cancel = catchAsync(async (req, res) => {
    const updatedById = req.user ? req.user._id : null;
    const data = await GameService.cancelGame(req.params.id, updatedById);
    res.status(200).json({
      success: true,
      message: 'Hủy trò chơi thành công',
      data,
    });
  });

  // Admin: danh sách trúng thưởng (gộp theo khách)
  static getWinners = catchAsync(async (req, res) => {
    const result = await GameService.getGameWinners(req.params.id, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách trúng thưởng thành công',
      data: result.winners,
      pagination: result.pagination,
    });
  });

  // Admin: chi tiết phần thưởng của 1 khách trong 1 trò chơi
  static getWinnerRewards = catchAsync(async (req, res) => {
    const data = await GameService.getCustomerGameRewards(req.params.id, req.params.customerId);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết trúng thưởng thành công',
      data,
    });
  });

  // Admin: cấp thêm lượt cho một khách
  static grantBonusTurns = catchAsync(async (req, res) => {
    const { customerId, quantity } = req.body;
    const data = await GameService.grantBonusTurns(req.params.id, customerId, quantity);
    res.status(200).json({
      success: true,
      message: 'Cấp lượt thành công',
      data,
    });
  });

  // ── Khách hàng ──
  static getMyTurns = catchAsync(async (req, res) => {
    requireCustomer(req);
    const data = await GameService.getMyTurns(req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Lấy số lượt chơi thành công',
      data,
    });
  });

  static draw = catchAsync(async (req, res) => {
    requireCustomer(req);
    const result = await GameService.drawGame(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: result.prize.type === 'MESSAGE' ? 'Chúc bạn may mắn lần sau!' : 'Chúc mừng bạn đã trúng thưởng!',
      data: result,
    });
  });

  static getAvailable = catchAsync(async (req, res) => {
    requireCustomer(req);
    const result = await GameService.getAvailableGames(req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách trò chơi thành công',
      data: result.games,
      pagination: result.pagination,
    });
  });

  static getDetailForCustomer = catchAsync(async (req, res) => {
    requireCustomer(req);
    const data = await GameService.getGameDetailForCustomer(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết trò chơi thành công',
      data,
    });
  });

  static getMyRewards = catchAsync(async (req, res) => {
    requireCustomer(req);
    const result = await GameService.getMyRewardHistory(req.user._id, req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy lịch sử trúng thưởng thành công',
      data: result.histories,
      pagination: result.pagination,
    });
  });
}

module.exports = GameController;
