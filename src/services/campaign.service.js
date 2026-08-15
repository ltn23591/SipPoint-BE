const Campaign = require('../models/campaign.model');
const CustomerSegment = require('../models/customerSegment.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const VoucherService = require('./voucher.service');
const { CAMPAIGN_STATUS, CUSTOMER_VOUCHER_SOURCE, ORDER_STATUS } = require('../enums');
const AppError = require('../utils/AppError');

class CampaignService {
  // Phát voucher vào ví cho danh sách khách hàng (dùng chung cho kích hoạt lần đầu và
  // phát bổ sung khi có thành viên mới). Bỏ qua trùng lặp (unique index campaignId+customerId).
  // Trả về số voucher thực phát được.
  static async _issueVouchers(campaign, voucher, customerIds) {
    if (!customerIds.length) return 0;

    const expiryDate = new Date(Math.min(new Date(voucher.endDate).getTime(), new Date(campaign.endDate).getTime()));
    const docs = customerIds.map((customerId) => ({
      customerId,
      voucherId: voucher._id,
      title: voucher.title,
      expiryDate,
      source: CUSTOMER_VOUCHER_SOURCE.CAMPAIGN,
      campaignId: campaign._id,
    }));

    let issuedCount = 0;
    try {
      const inserted = await CustomerVoucher.insertMany(docs, { ordered: false });
      issuedCount = inserted.length;
    } catch (error) {
      issuedCount = (error.insertedDocs && error.insertedDocs.length) || 0;
      if (issuedCount === 0 && (!error.writeErrors || error.writeErrors.some((e) => e.code !== 11000))) {
        throw error;
      }
    }

    if (issuedCount > 0) {
      await Voucher.updateOne({ _id: voucher._id }, { $inc: { issuedCount } });
    }
    return issuedCount;
  }

  // Phát voucher bổ sung cho các chiến dịch ĐANG HOẠT ĐỘNG nhắm tới 1 segment, dành cho
  // những khách hàng VỪA trở thành thành viên (gọi từ CustomerSegmentService sau khi đồng bộ).
  // Check thêm endDate (không chỉ dựa vào status) vì status ACTIVE->FINISHED chỉ được
  // cron cập nhật lúc 00:00 - tránh phát nhầm cho chiến dịch đã quá hạn nhưng cron chưa chạy tới.
  static async topUpVouchersForNewMembers(segmentId, customerIds) {
    if (!customerIds || customerIds.length === 0) return;

    const campaigns = await Campaign.find({
      segmentIds: segmentId,
      status: CAMPAIGN_STATUS.ACTIVE,
      endDate: { $gt: new Date() },
    });
    for (const campaign of campaigns) {
      const voucher = await Voucher.findById(campaign.voucherId);
      if (!voucher || voucher.isActive !== 'active') continue;

      const remainingStock = VoucherService.remainingStock(voucher);
      if (remainingStock <= 0) {
        console.warn(`[Campaign] "${campaign.name}" đã hết kho voucher, không thể phát bổ sung cho ${customerIds.length} thành viên mới`);
        continue;
      }

      const targetIds = customerIds.length > remainingStock ? customerIds.slice(0, remainingStock) : customerIds;
      if (targetIds.length < customerIds.length) {
        console.warn(`[Campaign] "${campaign.name}" chỉ còn ${remainingStock} voucher, không đủ phát cho ${customerIds.length} thành viên mới`);
      }

      const issuedCount = await CampaignService._issueVouchers(campaign, voucher, targetIds);
      if (issuedCount > 0) {
        await Campaign.updateOne({ _id: campaign._id }, { $inc: { issuedCount } });
      }
    }
  }

  static async createCampaign(data, createdById) {
    const existing = await Campaign.findOne({ name: data.name });
    if (existing) {
      throw new AppError('Tên chiến dịch đã tồn tại', 400);
    }

    if (!Array.isArray(data.segmentIds) || data.segmentIds.length === 0) {
      throw new AppError('Chiến dịch phải có ít nhất một nhóm khách hàng mục tiêu', 400);
    }
    const segmentCount = await CustomerSegment.countDocuments({ _id: { $in: data.segmentIds } });
    if (segmentCount !== data.segmentIds.length) {
      throw new AppError('Một hoặc nhiều nhóm khách hàng không tồn tại', 404);
    }

    const voucher = await Voucher.findById(data.voucherId);
    if (!voucher) {
      throw new AppError('Không tìm thấy voucher', 404);
    }

    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      throw new AppError('Ngày bắt đầu phải trước ngày kết thúc', 400);
    }

    const tw = data.conditions && data.conditions.timeWindow;
    if (tw && (tw.startHour === undefined || tw.endHour === undefined)) {
      throw new AppError('Khung giờ áp dụng phải có đủ giờ bắt đầu và giờ kết thúc', 400);
    }

    const campaign = await Campaign.create({
      name: data.name,
      description: data.description,
      segmentIds: data.segmentIds,
      voucherId: data.voucherId,
      conditions: data.conditions || {},
      startDate: data.startDate,
      endDate: data.endDate,
      createdBy: createdById || undefined,
    });

    return campaign;
  }

  static async getAllCampaigns(query = {}) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const campaigns = await Campaign.find(filter)
      .populate('segmentIds', 'name memberCount')
      .populate('voucherId', 'code title discountType discountValue usageLimit issuedCount usedCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Campaign.countDocuments(filter);

    return {
      campaigns,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCampaignById(id) {
    const campaign = await Campaign.findById(id)
      .populate('segmentIds', 'name memberCount lastSyncedAt')
      .populate('voucherId')
      .populate('createdBy', 'name email');
    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch', 404);
    }
    return campaign;
  }

  static async updateCampaign(id, data) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch', 404);
    }
    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể chỉnh sửa chiến dịch ở trạng thái nháp', 400);
    }

    const allowed = ['name', 'description', 'segmentIds', 'voucherId', 'conditions', 'startDate', 'endDate'];
    for (const key of allowed) {
      if (data[key] !== undefined) campaign[key] = data[key];
    }
    await campaign.save();

    return campaign;
  }

  static async deleteCampaign(id) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch', 404);
    }
    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể xóa chiến dịch ở trạng thái nháp', 400);
    }

    await Campaign.findByIdAndDelete(id);
    return {};
  }

  static async activateCampaign(id) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch', 404);
    }
    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      throw new AppError('Chỉ có thể kích hoạt chiến dịch ở trạng thái nháp', 400);
    }
    if (new Date(campaign.endDate) <= new Date()) {
      throw new AppError('Chiến dịch đã quá ngày kết thúc, không thể kích hoạt', 400);
    }

    const voucher = await Voucher.findById(campaign.voucherId);
    if (!voucher || voucher.isActive !== 'active') {
      throw new AppError('Voucher của chiến dịch không tồn tại hoặc đã bị khóa', 400);
    }

    const segments = await CustomerSegment.find({ _id: { $in: campaign.segmentIds } }).select('memberIds');
    const memberIdSet = new Set();
    for (const segment of segments) {
      for (const memberId of segment.memberIds) {
        memberIdSet.add(memberId.toString());
      }
    }
    const memberIds = [...memberIdSet];

    if (memberIds.length === 0) {
      throw new AppError('Các nhóm khách hàng mục tiêu không có thành viên nào', 400);
    }

    const remainingStock = VoucherService.remainingStock(voucher);
    if (remainingStock < memberIds.length) {
      throw new AppError(
        `Kho voucher không đủ: cần ${memberIds.length}, còn lại ${remainingStock}. Vui lòng tăng số lượng phát hành của voucher.`,
        400
      );
    }

    const issuedCount = await CampaignService._issueVouchers(campaign, voucher, memberIds);

    campaign.status = CAMPAIGN_STATUS.ACTIVE;
    campaign.issuedCount = issuedCount;
    campaign.activatedAt = new Date();
    await campaign.save();

    return { campaign, issuedCount };
  }

  static async deactivateCampaign(id) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch', 404);
    }
    if (campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
      throw new AppError('Chỉ có thể hủy chiến dịch đang hoạt động', 400);
    }

    const revoked = await CustomerVoucher.updateMany(
      { campaignId: campaign._id, isUsed: false },
      { expiryDate: new Date() }
    );

    campaign.status = CAMPAIGN_STATUS.CANCELLED;
    await campaign.save();

    return { campaign, revokedCount: revoked.modifiedCount };
  }

  // Báo cáo hiệu quả chiến dịch: đã phát / đã dùng / doanh thu quy đổi.
  // Nguồn sự thật là các bản ghi CustomerVoucher của chiến dịch (chính xác hơn campaign.issuedCount),
  // nối sang đơn hàng qua orderId để quy đổi doanh thu.
  // Lưu ý: unique index (campaignId, customerId) => mỗi khách tối đa 1 voucher/chiến dịch,
  // nên issued/used đồng thời là SỐ KHÁCH được phát / đã dùng.
  static async getCampaignReport(id) {
    const campaign = await Campaign.findById(id)
      .populate('segmentIds', 'name memberCount')
      .populate('voucherId', 'code title discountType discountValue');
    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch', 404);
    }

    const now = new Date();
    const [stats] = await CustomerVoucher.aggregate([
      { $match: { campaignId: campaign._id } },
      { $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: 'order' } },
      { $addFields: { order: { $arrayElemAt: ['$order', 0] } } },
      // Chỉ quy đổi doanh thu từ đơn ĐÃ HOÀN THÀNH. Đơn hủy/hoàn trả đã nhả voucher về
      // trạng thái chưa dùng nên không lọt vào đây.
      {
        $addFields: {
          paidOrder: {
            $cond: [{ $eq: ['$order.status', ORDER_STATUS.COMPLETED] }, '$order', null],
          },
        },
      },
      {
        $group: {
          _id: null,
          issued: { $sum: 1 },
          used: { $sum: { $cond: [{ $eq: ['$isUsed', true] }, 1, 0] } },
          expired: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$isUsed', true] }, { $lt: ['$expiryDate', now] }] },
                1,
                0,
              ],
            },
          },
          orderCount: { $sum: { $cond: [{ $ne: ['$paidOrder', null] }, 1, 0] } },
          revenue: { $sum: { $ifNull: ['$paidOrder.total', 0] } },
          discountGiven: { $sum: { $ifNull: ['$paidOrder.discount', 0] } },
        },
      },
    ]);

    const issued = stats ? stats.issued : 0;
    const used = stats ? stats.used : 0;
    const orderCount = stats ? stats.orderCount : 0;
    const revenue = stats ? stats.revenue : 0;

    return {
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        activatedAt: campaign.activatedAt,
        segments: campaign.segmentIds,
        voucher: campaign.voucherId,
      },
      // Số voucher đã phát vào ví
      issued,
      // Đã dùng (tính cả đơn chưa hoàn thành)
      used,
      // Chưa dùng, và phần trong đó đã quá hạn
      unused: issued - used,
      expired: stats ? stats.expired : 0,
      // Tỉ lệ sử dụng (%)
      usageRate: issued > 0 ? Math.round((used / issued) * 10000) / 100 : 0,
      // Số đơn đã hoàn thành có dùng voucher của chiến dịch
      orderCount,
      // Doanh thu quy đổi = tổng tiền thực thu của các đơn đó
      revenue,
      // Tổng tiền đã giảm cho khách trên các đơn đó
      discountGiven: stats ? stats.discountGiven : 0,
      // Giá trị đơn trung bình
      avgOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
    };
  }

  static async finishExpiredCampaigns() {
    const result = await Campaign.updateMany(
      { status: CAMPAIGN_STATUS.ACTIVE, endDate: { $lt: new Date() } },
      { status: CAMPAIGN_STATUS.FINISHED }
    );
    return { finished: result.modifiedCount };
  }
}

module.exports = CampaignService;
