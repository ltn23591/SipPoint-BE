const mongoose = require('mongoose');
const Game = require('../models/game.model');
const GameReward = require('../models/gameReward.model');
const GameRewardDistribution = require('../models/gameRewardDistribution.model');
const GameActivityConfig = require('../models/gameActivityConfig.model');
const UserTurn = require('../models/userTurn.model');
const UserGameRewardHistory = require('../models/userGameRewardHistory.model');
const UserTurnHistory = require('../models/userTurnHistory.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const CustomerSegment = require('../models/customerSegment.model');
const Customer = require('../models/customer.model');
const CustomerService = require('./customer.service');
const AppError = require('../utils/AppError');
const { acquireUserDrawLock, releaseUserDrawLock } = require('../utils/gameLock');
const {
  GAME_STATUS,
  GAME_REWARD_TYPE,
  GAME_ACTIVITY_TYPE,
  IS_ACTIVE,
  CUSTOMER_VOUCHER_SOURCE,
  POINT_TRANSACTION_TYPE,
} = require('../enums');

// Tín hiệu xung đột đồng thời (guard $inc trả null) - retry cả lượt quay
class ConcurrencyConflict extends Error {}

class GameService {
  // ── Helpers ──

  static _assertObjectId(id, label = 'ID không hợp lệ') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(label, 400);
    }
  }

  // Kiểm tra cấu trúc từng ô thưởng (draft cho phép chưa đủ nghiệp vụ; nghiệp vụ chốt ở publish)
  static _validateRewardsShape(rewards) {
    if (!Array.isArray(rewards) || rewards.length === 0) {
      throw new AppError('Trò chơi phải có ít nhất một ô thưởng', 400);
    }
    rewards.forEach((r, i) => {
      if (!r.displayName || !String(r.displayName).trim()) {
        throw new AppError(`Ô thứ ${i + 1} thiếu tên hiển thị`, 400);
      }
      if (!Object.values(GAME_REWARD_TYPE).includes(r.type)) {
        throw new AppError(`Ô "${r.displayName}" có loại phần thưởng không hợp lệ: ${r.type}`, 400);
      }
      if (r.type === GAME_REWARD_TYPE.VOUCHER && !r.voucherId) {
        throw new AppError(`Ô "${r.displayName}" là phần thưởng mã khuyến mãi nhưng chưa chọn voucher`, 400);
      }
      if (r.type === GAME_REWARD_TYPE.POINTS && (r.rewardValue === undefined || Number(r.rewardValue) <= 0)) {
        throw new AppError(`Ô "${r.displayName}" là phần thưởng điểm nhưng số điểm không hợp lệ`, 400);
      }
      if (r.totalReward !== undefined && Number(r.totalReward) < 0) {
        throw new AppError(`Ô "${r.displayName}" có tổng kho không hợp lệ`, 400);
      }
    });
  }

  static _buildRewardDocs(gameId, rewards) {
    return rewards.map((r, index) => {
      const total = r.totalReward !== undefined ? Number(r.totalReward) : 0;
      return {
        gameId,
        displayName: r.displayName,
        type: r.type,
        voucherId: r.type === GAME_REWARD_TYPE.VOUCHER ? r.voucherId : undefined,
        rewardValue: r.type === GAME_REWARD_TYPE.POINTS ? Number(r.rewardValue) : undefined,
        message: r.type === GAME_REWARD_TYPE.MESSAGE ? r.message : undefined,
        description: r.description,
        totalReward: total,
        remainingReward: total, // khởi tạo tồn = tổng kho
        quantity: r.quantity !== undefined ? Number(r.quantity) : 1,
        isDefault: !!r.isDefault,
        // Ô mặc định luôn cho trúng nhiều lần
        allowManyTimes: r.isDefault ? true : r.allowManyTimes !== false,
        index,
      };
    });
  }

  // distributions[].gameRewardIndex = vị trí ô trong mảng rewards (0-based)
  static _buildDistributionDocs(gameId, distributions, rewardIdByIndex) {
    if (!Array.isArray(distributions)) return [];
    return distributions.map((d) => {
      const rewardId = rewardIdByIndex[Number(d.gameRewardIndex)];
      if (!rewardId) {
        throw new AppError(`Dòng phân bổ trỏ tới ô không tồn tại (index ${d.gameRewardIndex})`, 400);
      }
      const max = Number(d.maxQuantity);
      return {
        gameId,
        gameRewardId: rewardId,
        segmentId: d.segmentId,
        rate: Number(d.rate),
        maxQuantity: max,
        remainingQuantity: max, // khởi tạo còn lại = maxQuantity
        dateFrom: d.dateFrom || undefined,
        dateTo: d.dateTo || undefined,
        displayOrder: d.displayOrder !== undefined ? Number(d.displayOrder) : 0,
        allowManyTimes: d.allowManyTimes !== false,
      };
    });
  }

  static _buildActivityConfigDocs(gameId, configs) {
    if (!Array.isArray(configs)) return [];
    return configs.map((c) => {
      if (!Object.values(GAME_ACTIVITY_TYPE).includes(c.activityType)) {
        throw new AppError(`Loại hoạt động không hợp lệ: ${c.activityType}`, 400);
      }
      return {
        gameId,
        activityType: c.activityType,
        turnQuantity: c.turnQuantity !== undefined ? Number(c.turnQuantity) : 1,
        dailyLimit: c.dailyLimit !== undefined ? Number(c.dailyLimit) : undefined,
        isActive: c.isActive !== false,
      };
    });
  }

  static async _persistChildren(gameId, data) {
    GameService._validateRewardsShape(data.rewards);
    const rewardDocs = GameService._buildRewardDocs(gameId, data.rewards);
    const inserted = await GameReward.insertMany(rewardDocs);
    const rewardIdByIndex = {};
    inserted.forEach((doc) => { rewardIdByIndex[doc.index] = doc._id; });

    const distDocs = GameService._buildDistributionDocs(gameId, data.distributions, rewardIdByIndex);
    if (distDocs.length) await GameRewardDistribution.insertMany(distDocs);

    const activityDocs = GameService._buildActivityConfigDocs(gameId, data.activityConfigs);
    if (activityDocs.length) await GameActivityConfig.insertMany(activityDocs);
  }

  static async _clearChildren(gameId) {
    await Promise.all([
      GameReward.deleteMany({ gameId }),
      GameRewardDistribution.deleteMany({ gameId }),
      GameActivityConfig.deleteMany({ gameId }),
    ]);
  }

  static _validateDates(startDate, endDate) {
    if (!endDate) {
      throw new AppError('Ngày kết thúc là bắt buộc', 400);
    }
    if (startDate && new Date(startDate) >= new Date(endDate)) {
      throw new AppError('Ngày bắt đầu phải trước ngày kết thúc', 400);
    }
  }

  static async _detail(id) {
    return Game.findById(id)
      .populate({ path: 'rewards', populate: { path: 'voucherId', select: 'code title discountType discountValue' }, options: { sort: { index: 1 } } })
      .populate({ path: 'distributions', populate: { path: 'segmentId', select: 'name memberCount' }, options: { sort: { displayOrder: 1 } } })
      .populate('activityConfigs')
      .populate('appliedSegmentIds', 'name memberCount')
      .populate('createdBy', 'name email');
  }

  // ── Admin CRUD ──

  static async createGame(data, createdById) {
    GameService._validateDates(data.startDate, data.endDate);

    if (data.appliedSegmentIds && data.appliedSegmentIds.length) {
      const found = await CustomerSegment.countDocuments({ _id: { $in: data.appliedSegmentIds } });
      if (found !== new Set(data.appliedSegmentIds.map(String)).size) {
        throw new AppError('Một hoặc nhiều nhóm khách hàng áp dụng không tồn tại', 404);
      }
    }

    const game = await Game.create({
      name: data.name,
      description: data.description,
      backgroundUrl: data.backgroundUrl,
      gameUrl: data.gameUrl,
      content: data.content,
      startDate: data.startDate,
      endDate: data.endDate,
      timeFrom: data.timeFrom,
      timeTo: data.timeTo,
      appliedSegmentIds: data.appliedSegmentIds || [],
      defaultTurnCount: data.defaultTurnCount !== undefined ? Number(data.defaultTurnCount) : 0,
      createdBy: createdById || undefined,
      // status mặc định DRAFT
    });

    await GameService._persistChildren(game._id, data);

    return GameService._detail(game._id);
  }

  static async getAllGames(query = {}) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const games = await Game.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Game.countDocuments(filter);

    // Số lượt tham gia (= số lượt quay) + số người tham gia, gộp từ lịch sử trúng thưởng
    const ids = games.map((g) => g._id);
    const stats = ids.length
      ? await UserGameRewardHistory.aggregate([
          { $match: { gameId: { $in: ids } } },
          { $group: { _id: '$gameId', spinCount: { $sum: 1 }, participants: { $addToSet: '$customerId' } } },
        ])
      : [];
    const statMap = new Map(stats.map((s) => [String(s._id), { spinCount: s.spinCount, participantCount: s.participants.length }]));

    const result = games.map((g) => {
      const obj = g.toObject({ virtuals: true });
      const st = statMap.get(String(g._id)) || { spinCount: 0, participantCount: 0 };
      obj.spinCount = st.spinCount;
      obj.participantCount = st.participantCount;
      return obj;
    });

    return {
      games: result,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Chi tiết phần thưởng 1 khách đã trúng trong 1 trò chơi (admin - dùng cho hàng mở rộng)
  static async getCustomerGameRewards(gameId, customerId) {
    GameService._assertObjectId(gameId, 'ID trò chơi không hợp lệ');
    GameService._assertObjectId(customerId, 'ID khách hàng không hợp lệ');
    const rows = await UserGameRewardHistory.find({ gameId, customerId })
      .populate('voucherId', 'code title discountType discountValue')
      .sort({ wonAt: -1 });
    return rows.map((r) => ({
      id: r._id,
      displayName: r.displayName,
      type: r.type,
      rewardValue: r.rewardValue,
      message: r.message,
      voucher: r.voucherId && r.voucherId._id
        ? { code: r.voucherId.code, title: r.voucherId.title, discountType: r.voucherId.discountType, discountValue: r.voucherId.discountValue }
        : undefined,
      wonAt: r.wonAt,
    }));
  }

  // Danh sách trúng thưởng (gộp theo khách) cho admin
  static async getGameWinners(gameId, query = {}) {
    GameService._assertObjectId(gameId, 'ID trò chơi không hợp lệ');
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * parseInt(limit);

    const pipeline = [
      { $match: { gameId: new mongoose.Types.ObjectId(String(gameId)) } },
      { $sort: { wonAt: -1 } },
      {
        $group: {
          _id: '$customerId',
          spinCount: { $sum: 1 },
          prizeCount: { $sum: { $cond: [{ $ne: ['$type', GAME_REWARD_TYPE.MESSAGE] }, 1, 0] } },
          lastPrizeName: { $first: '$displayName' },
          lastPrizeType: { $first: '$type' },
          lastWonAt: { $first: '$wonAt' },
        },
      },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    ];
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'customer.fullName': { $regex: search, $options: 'i' } },
            { 'customer.phone': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }
    pipeline.push({
      $facet: {
        data: [
          { $sort: { lastWonAt: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $project: {
              _id: 0,
              customerId: '$_id',
              fullName: '$customer.fullName',
              phone: '$customer.phone',
              spinCount: 1,
              prizeCount: 1,
              lastPrizeName: 1,
              lastPrizeType: 1,
              lastWonAt: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    });

    const [res] = await UserGameRewardHistory.aggregate(pipeline);
    const winners = res ? res.data : [];
    const total = res && res.total[0] ? res.total[0].count : 0;

    return {
      winners,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  static async getGameById(id) {
    GameService._assertObjectId(id, 'ID trò chơi không hợp lệ');
    const game = await GameService._detail(id);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    return game;
  }

  static async updateGame(id, data, updatedById) {
    GameService._assertObjectId(id, 'ID trò chơi không hợp lệ');
    const game = await Game.findById(id);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if (game.status !== GAME_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể chỉnh sửa trò chơi ở trạng thái nháp', 400);
    }

    const startDate = data.startDate !== undefined ? data.startDate : game.startDate;
    const endDate = data.endDate !== undefined ? data.endDate : game.endDate;
    GameService._validateDates(startDate, endDate);

    if (data.appliedSegmentIds && data.appliedSegmentIds.length) {
      const found = await CustomerSegment.countDocuments({ _id: { $in: data.appliedSegmentIds } });
      if (found !== new Set(data.appliedSegmentIds.map(String)).size) {
        throw new AppError('Một hoặc nhiều nhóm khách hàng áp dụng không tồn tại', 404);
      }
    }

    const allowed = ['name', 'description', 'backgroundUrl', 'gameUrl', 'content', 'startDate', 'endDate', 'timeFrom', 'timeTo', 'appliedSegmentIds', 'defaultTurnCount'];
    for (const key of allowed) {
      if (data[key] !== undefined) game[key] = data[key];
    }
    game.updatedBy = updatedById || game.updatedBy;
    await game.save();

    // Full-replace các con nếu request có gửi rewards
    if (data.rewards !== undefined) {
      await GameService._clearChildren(game._id);
      await GameService._persistChildren(game._id, data);
    }

    return GameService._detail(game._id);
  }

  static async deleteGame(id) {
    GameService._assertObjectId(id, 'ID trò chơi không hợp lệ');
    const game = await Game.findById(id);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if (game.status !== GAME_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể xóa trò chơi ở trạng thái nháp', 400);
    }
    await GameService._clearChildren(game._id);
    await Game.findByIdAndDelete(id);
    return {};
  }

  // ── Chuyển trạng thái ──

  // Validate đầy đủ nghiệp vụ trước khi xuất bản
  static async _validateForPublish(game) {
    if (new Date(game.endDate) <= new Date()) {
      throw new AppError('Trò chơi đã quá ngày kết thúc, không thể xuất bản', 400);
    }

    const rewards = await GameReward.find({ gameId: game._id });
    if (rewards.length === 0) {
      throw new AppError('Trò chơi phải có ít nhất một ô thưởng', 400);
    }

    // Đúng 1 ô mặc định, phải là MESSAGE + allowManyTimes
    const defaults = rewards.filter((r) => r.isDefault);
    if (defaults.length !== 1) {
      throw new AppError('Trò chơi phải có đúng một ô mặc định (chúc may mắn)', 400);
    }
    const def = defaults[0];
    if (def.type !== GAME_REWARD_TYPE.MESSAGE) {
      throw new AppError('Ô mặc định phải là loại lời chúc (MESSAGE)', 400);
    }
    if (!def.allowManyTimes) {
      throw new AppError('Ô mặc định phải cho phép trúng nhiều lần', 400);
    }

    // Voucher của các ô VOUCHER phải tồn tại & đang active
    const voucherIds = rewards.filter((r) => r.type === GAME_REWARD_TYPE.VOUCHER && r.voucherId).map((r) => r.voucherId);
    if (voucherIds.length) {
      const vouchers = await Voucher.find({ _id: { $in: voucherIds } });
      const vMap = new Map(vouchers.map((v) => [String(v._id), v]));
      for (const r of rewards) {
        if (r.type !== GAME_REWARD_TYPE.VOUCHER) continue;
        const v = vMap.get(String(r.voucherId));
        if (!v) throw new AppError(`Voucher của ô "${r.displayName}" không tồn tại`, 404);
        if (v.isActive !== IS_ACTIVE.TRUE) {
          throw new AppError(`Voucher của ô "${r.displayName}" đang không hoạt động`, 400);
        }
      }
    }

    // Dòng phân bổ: segment thuộc appliedSegmentIds, ngày hợp lệ, Σ maxQuantity ≤ totalReward mỗi ô
    const distributions = await GameRewardDistribution.find({ gameId: game._id });
    const appliedSet = new Set((game.appliedSegmentIds || []).map(String));
    const maxByReward = {};
    for (const d of distributions) {
      if (!appliedSet.has(String(d.segmentId))) {
        throw new AppError('Có dòng phân bổ trỏ tới nhóm khách hàng không nằm trong danh sách áp dụng', 400);
      }
      if (d.rate < 0 || d.rate > 100) {
        throw new AppError('Tỉ lệ phân bổ phải trong khoảng 0–100%', 400);
      }
      if (d.dateFrom && d.dateTo && new Date(d.dateFrom) >= new Date(d.dateTo)) {
        throw new AppError('Cửa sổ ngày của dòng phân bổ không hợp lệ', 400);
      }
      const key = String(d.gameRewardId);
      maxByReward[key] = (maxByReward[key] || 0) + d.maxQuantity;
    }
    for (const r of rewards) {
      const used = maxByReward[String(r._id)] || 0;
      if (used > r.totalReward) {
        throw new AppError(`Tổng số lượng phân bổ của ô "${r.displayName}" (${used}) vượt quá tổng kho (${r.totalReward})`, 400);
      }
    }
  }

  static async publishGame(id, updatedById) {
    GameService._assertObjectId(id, 'ID trò chơi không hợp lệ');
    const game = await Game.findById(id);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if (game.status !== GAME_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể xuất bản trò chơi ở trạng thái nháp', 400);
    }
    await GameService._validateForPublish(game);

    game.status = GAME_STATUS.PUBLISHED;
    game.updatedBy = updatedById || game.updatedBy;
    await game.save();
    return GameService._detail(game._id);
  }

  static async pauseGame(id, updatedById) {
    return GameService._transition(id, GAME_STATUS.PAUSED, [GAME_STATUS.PUBLISHED], 'Chỉ có thể tạm dừng trò chơi đang xuất bản', updatedById);
  }

  static async resumeGame(id, updatedById) {
    return GameService._transition(id, GAME_STATUS.PUBLISHED, [GAME_STATUS.PAUSED], 'Chỉ có thể mở lại trò chơi đang tạm dừng', updatedById);
  }

  static async cancelGame(id, updatedById) {
    return GameService._transition(id, GAME_STATUS.CANCELLED, [GAME_STATUS.PUBLISHED, GAME_STATUS.PAUSED], 'Chỉ có thể hủy trò chơi đang xuất bản hoặc tạm dừng', updatedById);
  }

  static async _transition(id, toStatus, fromStatuses, errMsg, updatedById) {
    GameService._assertObjectId(id, 'ID trò chơi không hợp lệ');
    const game = await Game.findById(id);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if (!fromStatuses.includes(game.status)) {
      throw new AppError(errMsg, 400);
    }
    // Không cho mở lại trò chơi đã quá hạn
    if (toStatus === GAME_STATUS.PUBLISHED && new Date(game.endDate) <= new Date()) {
      throw new AppError('Trò chơi đã quá ngày kết thúc', 400);
    }
    game.status = toStatus;
    game.updatedBy = updatedById || game.updatedBy;
    await game.save();
    return GameService._detail(game._id);
  }

  // ── Lượt chơi (UserTurn) ──

  // Đảm bảo có UserTurn cho (game, khách); tự seed từ defaultTurnCount nếu chưa có (atomic, chống race).
  static async _ensureUserTurn(game, customerId) {
    const seed = game.defaultTurnCount || 0;
    return UserTurn.findOneAndUpdate(
      { gameId: game._id, customerId },
      {
        $setOnInsert: {
          gameId: game._id,
          customerId,
          totalTurns: seed,
          usedTurns: 0,
          remainingTurns: seed,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  // Khách xem số lượt của mình cho 1 trò chơi (auto-seed lần đầu).
  static async getMyTurns(gameId, customerId) {
    GameService._assertObjectId(gameId, 'ID trò chơi không hợp lệ');
    const game = await Game.findById(gameId);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if (game.status !== GAME_STATUS.PUBLISHED) {
      throw new AppError('Trò chơi chưa mở hoặc đã kết thúc', 400);
    }
    const turn = await GameService._ensureUserTurn(game, customerId);
    return {
      gameId: game._id,
      customerId,
      totalTurns: turn.totalTurns,
      usedTurns: turn.usedTurns,
      remainingTurns: turn.remainingTurns,
    };
  }

  // Admin cấp thêm lượt cho một khách (cộng dồn atomic).
  static async grantBonusTurns(gameId, customerId, quantity) {
    GameService._assertObjectId(gameId, 'ID trò chơi không hợp lệ');
    GameService._assertObjectId(customerId, 'ID khách hàng không hợp lệ');
    const q = Number(quantity);
    if (!Number.isInteger(q) || q <= 0) {
      throw new AppError('Số lượt cấp phải là số nguyên dương', 400);
    }

    const game = await Game.findById(gameId);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if ([GAME_STATUS.EXPIRED, GAME_STATUS.CANCELLED].includes(game.status)) {
      throw new AppError('Không thể cấp lượt cho trò chơi đã hết hạn hoặc đã hủy', 400);
    }

    const customerExists = await Customer.exists({ _id: customerId });
    if (!customerExists) {
      throw new AppError('Không tìm thấy khách hàng', 404);
    }

    const turn = await UserTurn.findOneAndUpdate(
      { gameId, customerId },
      {
        $inc: { totalTurns: q, remainingTurns: q },
        $setOnInsert: { gameId, customerId, usedTurns: 0 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await UserTurnHistory.create({ gameId, customerId, quantity: q, note: 'Admin cấp lượt thủ công' });
    return {
      gameId,
      customerId,
      granted: q,
      totalTurns: turn.totalTurns,
      usedTurns: turn.usedTurns,
      remainingTurns: turn.remainingTurns,
    };
  }

  // Khoảng [đầu, cuối) của ngày hôm nay theo giờ VN (UTC+7), trả về mốc UTC
  static _vnDayRange(now = new Date()) {
    const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const startUtcMs = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 7 * 60 * 60 * 1000;
    return { start: new Date(startUtcMs), end: new Date(startUtcMs + 24 * 60 * 60 * 1000) };
  }

  // Cấp lượt cho mọi trò chơi đang mở có GameActivityConfig khớp activityType.
  // Tôn trọng dailyLimit theo ngày VN. Fire-and-forget (không chặn luồng gọi).
  static async grantTurnsForActivity(customerId, activityType, opts = {}) {
    if (!Object.values(GAME_ACTIVITY_TYPE).includes(activityType)) return { granted: [] };
    const now = new Date();
    const configs = await GameActivityConfig.find({ activityType, isActive: true });
    const granted = [];

    for (const cfg of configs) {
      const game = await Game.findById(cfg.gameId);
      if (!game || game.status !== GAME_STATUS.PUBLISHED) continue;
      if (game.endDate && new Date(game.endDate) < now) continue;

      let q = cfg.turnQuantity || 0;
      if (q <= 0) continue;

      // dailyLimit: tổng lượt đã cấp trong ngày VN cho (game, khách, hoạt động)
      if (cfg.dailyLimit && cfg.dailyLimit > 0) {
        const { start, end } = GameService._vnDayRange(now);
        const rows = await UserTurnHistory.find({
          gameId: cfg.gameId,
          customerId,
          activityType,
          grantedAt: { $gte: start, $lt: end },
        }).select('quantity');
        const usedToday = rows.reduce((s, r) => s + (r.quantity || 0), 0);
        const remaining = cfg.dailyLimit - usedToday;
        if (remaining <= 0) continue;
        q = Math.min(q, remaining);
      }

      const turn = await UserTurn.findOneAndUpdate(
        { gameId: cfg.gameId, customerId },
        { $inc: { totalTurns: q, remainingTurns: q }, $setOnInsert: { gameId: cfg.gameId, customerId, usedTurns: 0 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      await UserTurnHistory.create({
        gameId: cfg.gameId,
        customerId,
        activityType,
        quantity: q,
        note: opts.note || `Cấp lượt từ hoạt động ${activityType}`,
      });
      granted.push({ gameId: cfg.gameId, quantity: q, remainingTurns: turn.remainingTurns });
    }

    return { granted };
  }

  // ── Draw engine (đồng bộ) ──

  // Phút trong ngày theo giờ VN (UTC+7)
  static _vnMinutesOfDay(now = new Date()) {
    return (now.getUTCHours() * 60 + now.getUTCMinutes() + 7 * 60) % 1440;
  }

  static _parseHHmm(str) {
    if (!str || typeof str !== 'string') return null;
    const [h, m] = str.split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  // Trò chơi có đang trong cửa sổ ngày + giờ (VN) hay không
  static _isWithinWindow(game, now = new Date()) {
    if (game.startDate && now < new Date(game.startDate)) return false;
    if (game.endDate && now > new Date(game.endDate)) return false;
    const from = GameService._parseHHmm(game.timeFrom);
    const to = GameService._parseHHmm(game.timeTo);
    if (from === null || to === null) return true; // không giới hạn giờ
    const cur = GameService._vnMinutesOfDay(now);
    if (from <= to) return cur >= from && cur <= to;
    return cur >= from || cur <= to; // cửa sổ qua nửa đêm
  }

  // Khách có thuộc nhóm áp dụng không (rỗng = mở cho tất cả)
  static async _isCustomerEligible(game, customerId) {
    if (!game.appliedSegmentIds || game.appliedSegmentIds.length === 0) return true;
    const inSegment = await CustomerSegment.exists({
      _id: { $in: game.appliedSegmentIds },
      memberIds: customerId,
    });
    return !!inSegment;
  }

  // Chọn ngẫu nhiên theo trọng số remainingReward (kho nhiều ⇒ cơ hội cao)
  static _pickByRemaining(rewards) {
    const total = rewards.reduce((s, r) => s + (r.remainingReward || 0), 0);
    if (total <= 0) return rewards[Math.floor(Math.random() * rewards.length)];
    let r = Math.random() * total;
    for (const rw of rewards) {
      r -= rw.remainingReward || 0;
      if (r <= 0) return rw;
    }
    return rewards[rewards.length - 1];
  }

  // DTO phần thưởng cho khách (KHÔNG lộ totalReward/remaining/isDefault/allowManyTimes)
  static _prizeDto(reward, extra = {}) {
    return {
      rewardId: reward._id,
      type: reward.type,
      displayName: reward.displayName,
      message: reward.type === GAME_REWARD_TYPE.MESSAGE ? reward.message : undefined,
      rewardValue: reward.type === GAME_REWARD_TYPE.POINTS ? reward.rewardValue : undefined,
      voucherId: reward.type === GAME_REWARD_TYPE.VOUCHER ? reward.voucherId : undefined,
      quantity: reward.quantity,
      index: reward.index,
      ...extra,
    };
  }

  // Phát phần thưởng (side effect). Trả { customerVoucherId } nếu là voucher.
  static async _applySideEffects(game, reward, awardedVoucher, customerId) {
    if (reward.type === GAME_REWARD_TYPE.POINTS && reward.rewardValue > 0) {
      await CustomerService.adjustPoints(
        customerId,
        reward.rewardValue,
        `Trúng thưởng: ${game.name}`,
        `Trò chơi may mắn - ${reward.displayName}`,
        POINT_TRANSACTION_TYPE.LUCKY_GAME
      );
      return {};
    }
    if (reward.type === GAME_REWARD_TYPE.VOUCHER && awardedVoucher) {
      const v = awardedVoucher;
      const expiryDate = new Date(
        Math.min(new Date(v.endDate).getTime(), new Date(game.endDate).getTime())
      );
      const cv = await CustomerVoucher.create({
        customerId,
        voucherId: v._id,
        title: v.title,
        expiryDate,
        source: CUSTOMER_VOUCHER_SOURCE.LUCKY_GAME,
      });
      return { customerVoucherId: cv._id };
    }
    return {};
  }

  // Claim voucher (issuedCount). Trả voucher hoặc null nếu hết / không active.
  static async _claimVoucher(voucherId) {
    return Voucher.findOneAndUpdate(
      { _id: voucherId, isActive: IS_ACTIVE.TRUE, $expr: { $lt: ['$issuedCount', '$usageLimit'] } },
      { $inc: { issuedCount: 1 } },
      { new: true }
    );
  }

  // Distribution có đang hiệu lực theo ngày? (cả 2 null = luôn; đúng 1 null = không hiệu lực)
  static _isDistInEffect(d, now = new Date()) {
    const hasFrom = !!d.dateFrom;
    const hasTo = !!d.dateTo;
    if (!hasFrom && !hasTo) return true;
    if (hasFrom !== hasTo) return false;
    return now >= new Date(d.dateFrom) && now <= new Date(d.dateTo);
  }

  // Commit chung cho cả 2 mode. Trừ kho ô (bỏ qua nếu ô mặc định = không giới hạn),
  // trừ hạn mức dòng phân bổ (nếu có), trừ lượt, side effect, ghi history.
  // Ném ConcurrencyConflict (guard $inc null) để retry cả lượt.
  static async _commitDraw(game, reward, distribution, customerId, awardedVoucher) {
    const rollbacks = [];
    const rollbackAll = async () => {
      for (const fn of rollbacks.reverse()) {
        try { await fn(); } catch (e) { /* best-effort */ }
      }
    };

    // 1) Trừ kho ô (ô mặc định không tốn kho)
    if (!reward.isDefault) {
      const claimed = await GameReward.findOneAndUpdate(
        { _id: reward._id, remainingReward: { $gt: 0 } },
        { $inc: { remainingReward: -1 } },
        { new: true }
      );
      if (!claimed) {
        if (awardedVoucher) await Voucher.updateOne({ _id: awardedVoucher._id }, { $inc: { issuedCount: -1 } });
        throw new ConcurrencyConflict();
      }
      rollbacks.push(() => GameReward.updateOne({ _id: reward._id }, { $inc: { remainingReward: 1 } }));
    }
    if (awardedVoucher) rollbacks.push(() => Voucher.updateOne({ _id: awardedVoucher._id }, { $inc: { issuedCount: -1 } }));

    // 2) Trừ hạn mức dòng phân bổ
    if (distribution) {
      const claimedDist = await GameRewardDistribution.findOneAndUpdate(
        { _id: distribution._id, remainingQuantity: { $gt: 0 } },
        { $inc: { remainingQuantity: -1 } },
        { new: true }
      );
      if (!claimedDist) { await rollbackAll(); throw new ConcurrencyConflict(); }
      rollbacks.push(() => GameRewardDistribution.updateOne({ _id: distribution._id }, { $inc: { remainingQuantity: 1 } }));
    }

    // 3) Trừ lượt
    const claimedTurn = await UserTurn.findOneAndUpdate(
      { gameId: game._id, customerId, remainingTurns: { $gt: 0 } },
      { $inc: { remainingTurns: -1, usedTurns: 1 } },
      { new: true }
    );
    if (!claimedTurn) { await rollbackAll(); throw new AppError('Bạn đã hết lượt chơi', 400); }
    rollbacks.push(() => UserTurn.updateOne({ gameId: game._id, customerId }, { $inc: { remainingTurns: 1, usedTurns: -1 } }));

    // 4) Side effect
    let effect = {};
    try {
      effect = await GameService._applySideEffects(game, reward, awardedVoucher, customerId);
    } catch (err) {
      await rollbackAll();
      throw err;
    }

    // 5) Ghi lịch sử (snapshot)
    await UserGameRewardHistory.create({
      gameId: game._id,
      gameRewardId: reward._id,
      customerId,
      distributionId: distribution ? distribution._id : null,
      displayName: reward.displayName,
      type: reward.type,
      voucherId: reward.type === GAME_REWARD_TYPE.VOUCHER ? reward.voucherId : undefined,
      rewardValue: reward.type === GAME_REWARD_TYPE.POINTS ? reward.rewardValue : undefined,
      message: reward.type === GAME_REWARD_TYPE.MESSAGE ? reward.message : undefined,
      quantity: reward.quantity,
      index: reward.index,
      customerVoucherId: effect.customerVoucherId,
      wonAt: new Date(),
    });

    return {
      prize: GameService._prizeDto(reward, { customerVoucherId: effect.customerVoucherId }),
      remainingTurns: claimedTurn.remainingTurns,
    };
  }

  // Trả ô mặc định (wish). Ném lỗi nếu game không có ô mặc định còn hiệu lực.
  static async _resolveWish(game, defaultReward, customerId) {
    if (!defaultReward) throw new AppError('Trò chơi đã hết phần thưởng', 400);
    return GameService._commitDraw(game, defaultReward, null, customerId, null);
  }

  // Default-wheel mode: weighted random theo remainingReward, single-win theo ô.
  static async _attemptDrawDefault(game, customerId) {
    const active = await GameReward.find({ gameId: game._id, remainingReward: { $gt: 0 } });
    const defaultReward = await GameReward.findOne({ gameId: game._id, isDefault: true });

    const wonRows = await UserGameRewardHistory.find({
      gameId: game._id,
      customerId,
      distributionId: null,
    }).select('gameRewardId');
    const wonSet = new Set(wonRows.map((h) => String(h.gameRewardId)));

    const normal = active.filter((r) => !r.isDefault);
    const eligible = normal.filter((r) => r.allowManyTimes || !wonSet.has(String(r._id)));

    if (!eligible.length) return GameService._resolveWish(game, defaultReward, customerId);

    const pick = GameService._pickByRemaining(eligible);
    let awardedVoucher = null;
    if (pick.type === GAME_REWARD_TYPE.VOUCHER) {
      awardedVoucher = await GameService._claimVoucher(pick.voucherId);
      if (!awardedVoucher) return GameService._resolveWish(game, defaultReward, customerId);
    }
    return GameService._commitDraw(game, pick, null, customerId, awardedVoucher);
  }

  // Allocation mode: bucket xác suất theo dòng phân bổ khớp nhóm KH của khách.
  static async _attemptDrawAllocation(game, customer, distributions) {
    const now = new Date();
    const active = await GameReward.find({ gameId: game._id, remainingReward: { $gt: 0 } });
    const rewardMap = new Map(active.map((r) => [String(r._id), r]));
    const defaultReward = await GameReward.findOne({ gameId: game._id, isDefault: true });

    // Nhóm KH của khách trong số các segment mà dòng phân bổ tham chiếu
    const distSegmentIds = [...new Set(distributions.map((d) => String(d.segmentId)))];
    const mySegs = await CustomerSegment.find({ _id: { $in: distSegmentIds }, memberIds: customer._id }).select('_id');
    const mySegSet = new Set(mySegs.map((s) => String(s._id)));

    // Dòng phân bổ khách đã trúng (single-win theo dòng)
    const wonRows = await UserGameRewardHistory.find({
      gameId: game._id,
      customerId: customer._id,
      distributionId: { $ne: null },
    }).select('distributionId');
    const wonDist = new Set(wonRows.map((h) => String(h.distributionId)));

    const eligibleLines = distributions.filter((d) =>
      GameService._isDistInEffect(d, now) &&
      d.remainingQuantity > 0 &&
      mySegSet.has(String(d.segmentId)) &&
      (d.allowManyTimes || !wonDist.has(String(d._id))) &&
      rewardMap.has(String(d.gameRewardId))
    );

    if (!eligibleLines.length) return GameService._resolveWish(game, defaultReward, customer._id);

    // Dựng bucket xác suất, chặn trần tổng 100%
    let accum = 0;
    const buckets = [];
    for (const d of eligibleLines) {
      if (accum >= 100) break;
      const eff = Math.min(d.rate, 100 - accum);
      if (eff <= 0) continue;
      buckets.push({ from: accum, to: accum + eff, line: d });
      accum += eff;
    }

    const roll = Math.random() * 100;
    const match = buckets.find((b) => roll >= b.from && roll < b.to);
    if (!match) return GameService._resolveWish(game, defaultReward, customer._id); // miss hợp lệ (tổng rate < 100)

    const line = match.line;
    const reward = rewardMap.get(String(line.gameRewardId));

    let awardedVoucher = null;
    if (reward.type === GAME_REWARD_TYPE.VOUCHER) {
      awardedVoucher = await GameService._claimVoucher(reward.voucherId);
      if (!awardedVoucher) return GameService._resolveWish(game, defaultReward, customer._id);
    }
    return GameService._commitDraw(game, reward, line, customer._id, awardedVoucher);
  }

  // Dispatcher: allocation nếu có ≥1 dòng phân bổ đang hiệu lực (theo ngày), ngược lại default-wheel.
  static async _attemptDraw(game, customer) {
    const distributions = await GameRewardDistribution.find({ gameId: game._id }).sort({ displayOrder: 1, createdAt: 1 });
    const now = new Date();
    const allocationActive = distributions.some((d) => GameService._isDistInEffect(d, now));
    if (allocationActive) return GameService._attemptDrawAllocation(game, customer, distributions);
    return GameService._attemptDrawDefault(game, customer._id);
  }

  // Điểm vào: quay đồng bộ với khóa per-user + retry.
  static async drawGame(gameId, customer) {
    GameService._assertObjectId(gameId, 'ID trò chơi không hợp lệ');
    const game = await Game.findById(gameId);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if (game.status !== GAME_STATUS.PUBLISHED) {
      throw new AppError('Trò chơi chưa mở hoặc đã kết thúc', 400);
    }
    if (!GameService._isWithinWindow(game)) {
      throw new AppError('Trò chơi không nằm trong thời gian hoạt động', 400);
    }
    if (!(await GameService._isCustomerEligible(game, customer._id))) {
      throw new AppError('Bạn không thuộc nhóm khách hàng được áp dụng trò chơi này', 403);
    }

    // Seed lượt (nếu chưa có) và kiểm tra sơ bộ còn lượt
    const turn = await GameService._ensureUserTurn(game, customer._id);
    if (turn.remainingTurns <= 0) {
      throw new AppError('Bạn đã hết lượt chơi', 400);
    }

    const lock = await acquireUserDrawLock(String(customer._id));
    if (!lock.acquired && !lock.degraded) {
      throw new AppError('Bạn đang có một lượt quay đang xử lý, vui lòng thử lại', 429);
    }
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await GameService._attemptDraw(game, customer);
        } catch (err) {
          if (err instanceof ConcurrencyConflict) continue;
          throw err;
        }
      }
      throw new AppError('Hệ thống đang bận, vui lòng thử lại', 409);
    } finally {
      await releaseUserDrawLock(lock);
    }
  }

  // ── DTO cho khách (ẩn totalReward/remaining/isDefault/allowManyTimes, không lộ phân bổ/kho) ──

  static _toMobileReward(r) {
    const voucher = r.voucherId && r.voucherId._id
      ? { id: r.voucherId._id, code: r.voucherId.code, title: r.voucherId.title, discountType: r.voucherId.discountType, discountValue: r.voucherId.discountValue }
      : undefined;
    return {
      rewardId: r._id,
      type: r.type,
      displayName: r.displayName,
      description: r.description,
      message: r.type === GAME_REWARD_TYPE.MESSAGE ? r.message : undefined,
      rewardValue: r.type === GAME_REWARD_TYPE.POINTS ? r.rewardValue : undefined,
      voucher,
      quantity: r.quantity,
      index: r.index,
    };
  }

  static _toMobileGame(game, rewards) {
    return {
      id: game._id,
      name: game.name,
      description: game.description,
      backgroundUrl: game.backgroundUrl,
      gameUrl: game.gameUrl,
      content: game.content,
      startDate: game.startDate,
      endDate: game.endDate,
      timeFrom: game.timeFrom,
      timeTo: game.timeTo,
      status: game.status,
      runtimePhase: game.runtimePhase,
      rewards: [...rewards].sort((a, b) => a.index - b.index).map(GameService._toMobileReward),
    };
  }

  // Danh sách trò chơi đang mở & áp dụng cho khách
  static async getAvailableGames(customer, query = {}) {
    const { page = 1, limit = 10 } = query;
    const now = new Date();

    const games = await Game.find({ status: GAME_STATUS.PUBLISHED, endDate: { $gte: now } }).sort({ createdAt: -1 });
    const eligibleFlags = await Promise.all(games.map((g) => GameService._isCustomerEligible(g, customer._id)));
    const applicable = games.filter((_, i) => eligibleFlags[i]);

    const total = applicable.length;
    const skip = (page - 1) * limit;
    const pageItems = applicable.slice(skip, skip + parseInt(limit));

    const result = await Promise.all(
      pageItems.map(async (g) => {
        const rewards = await GameReward.find({ gameId: g._id }).populate('voucherId', 'code title discountType discountValue');
        return GameService._toMobileGame(g, rewards);
      })
    );

    return {
      games: result,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  // Chi tiết trò chơi cho khách (kèm số lượt còn lại, tự seed)
  static async getGameDetailForCustomer(gameId, customer) {
    GameService._assertObjectId(gameId, 'ID trò chơi không hợp lệ');
    const game = await Game.findById(gameId);
    if (!game) {
      throw new AppError('Không tìm thấy trò chơi', 404);
    }
    if (game.status !== GAME_STATUS.PUBLISHED) {
      throw new AppError('Trò chơi chưa mở hoặc đã kết thúc', 400);
    }
    if (!(await GameService._isCustomerEligible(game, customer._id))) {
      throw new AppError('Bạn không thuộc nhóm khách hàng được áp dụng trò chơi này', 403);
    }

    const rewards = await GameReward.find({ gameId: game._id }).populate('voucherId', 'code title discountType discountValue');
    const turn = await GameService._ensureUserTurn(game, customer._id);

    return {
      ...GameService._toMobileGame(game, rewards),
      remainingTurns: turn.remainingTurns,
    };
  }

  // Lịch sử trúng thưởng của khách
  static async getMyRewardHistory(customerId, query = {}) {
    const { page = 1, limit = 20, gameId } = query;
    const skip = (page - 1) * limit;

    const filter = { customerId };
    if (gameId) {
      GameService._assertObjectId(gameId, 'ID trò chơi không hợp lệ');
      filter.gameId = gameId;
    }

    const histories = await UserGameRewardHistory.find(filter)
      .populate('gameId', 'name')
      .populate('voucherId', 'code title discountType discountValue')
      .sort({ wonAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await UserGameRewardHistory.countDocuments(filter);

    return {
      histories,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Cron: tự hết hạn ──
  static async expireEndedGames() {
    const res = await Game.updateMany(
      { status: GAME_STATUS.PUBLISHED, endDate: { $lt: new Date() } },
      { $set: { status: GAME_STATUS.EXPIRED } }
    );
    return { expired: res.modifiedCount || 0 };
  }
}

module.exports = GameService;
