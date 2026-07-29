const Campaign = require('../models/campaign.model');
const CustomerSegment = require('../models/customerSegment.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const { CAMPAIGN_STATUS, CUSTOMER_VOUCHER_SOURCE } = require('../enums');
const AppError = require('../utils/AppError');

class CampaignService {
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

    const remainingStock = voucher.usageLimit - voucher.issuedCount;
    if (remainingStock < memberIds.length) {
      throw new AppError(
        `Kho voucher không đủ: cần ${memberIds.length}, còn lại ${remainingStock}. Vui lòng tăng số lượng phát hành của voucher.`,
        400
      );
    }

    const expiryDate = new Date(Math.min(new Date(voucher.endDate).getTime(), new Date(campaign.endDate).getTime()));
    const docs = memberIds.map((customerId) => ({
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

  static async finishExpiredCampaigns() {
    const result = await Campaign.updateMany(
      { status: CAMPAIGN_STATUS.ACTIVE, endDate: { $lt: new Date() } },
      { status: CAMPAIGN_STATUS.FINISHED }
    );
    return { finished: result.modifiedCount };
  }
}

module.exports = CampaignService;
