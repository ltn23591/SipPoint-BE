const Campaign = require('../models/campaign.model');
const CustomerSegment = require('../models/customerSegment.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const { CAMPAIGN_STATUS, CUSTOMER_VOUCHER_SOURCE } = require('../enums');

class CampaignService {
  static async createCampaign(data, createdById) {
    const existing = await Campaign.findOne({ name: data.name });
    if (existing) {
      return { status: 400, success: false, message: 'Tên chiến dịch đã tồn tại' };
    }

    if (!Array.isArray(data.segmentIds) || data.segmentIds.length === 0) {
      return { status: 400, success: false, message: 'Chiến dịch phải có ít nhất một nhóm khách hàng mục tiêu' };
    }
    const segmentCount = await CustomerSegment.countDocuments({ _id: { $in: data.segmentIds } });
    if (segmentCount !== data.segmentIds.length) {
      return { status: 404, success: false, message: 'Một hoặc nhiều nhóm khách hàng không tồn tại' };
    }

    const voucher = await Voucher.findById(data.voucherId);
    if (!voucher) {
      return { status: 404, success: false, message: 'Không tìm thấy voucher' };
    }

    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      return { status: 400, success: false, message: 'Ngày bắt đầu phải trước ngày kết thúc' };
    }

    const tw = data.conditions && data.conditions.timeWindow;
    if (tw && (tw.startHour === undefined || tw.endHour === undefined)) {
      return { status: 400, success: false, message: 'Khung giờ áp dụng phải có đủ giờ bắt đầu và giờ kết thúc' };
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

    return { status: 201, success: true, message: 'Tạo chiến dịch thành công', data: campaign };
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
      status: 200,
      success: true,
      message: 'Lấy danh sách chiến dịch thành công',
      data: campaigns,
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
      return { status: 404, success: false, message: 'Không tìm thấy chiến dịch' };
    }
    return { status: 200, success: true, message: 'Lấy chi tiết chiến dịch thành công', data: campaign };
  }

  static async updateCampaign(id, data) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return { status: 404, success: false, message: 'Không tìm thấy chiến dịch' };
    }
    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      return { status: 400, success: false, message: 'Chỉ có thể chỉnh sửa chiến dịch ở trạng thái nháp' };
    }

    const allowed = ['name', 'description', 'segmentIds', 'voucherId', 'conditions', 'startDate', 'endDate'];
    for (const key of allowed) {
      if (data[key] !== undefined) campaign[key] = data[key];
    }
    await campaign.save();

    return { status: 200, success: true, message: 'Cập nhật chiến dịch thành công', data: campaign };
  }

  static async deleteCampaign(id) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return { status: 404, success: false, message: 'Không tìm thấy chiến dịch' };
    }
    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      return { status: 400, success: false, message: 'Chỉ có thể xóa chiến dịch ở trạng thái nháp' };
    }

    await Campaign.findByIdAndDelete(id);
    return { status: 200, success: true, message: 'Xóa chiến dịch thành công' };
  }

  // Kích hoạt chiến dịch: quét thành viên các nhóm mục tiêu và phát voucher vào ví
  static async activateCampaign(id) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return { status: 404, success: false, message: 'Không tìm thấy chiến dịch' };
    }
    if (campaign.status !== CAMPAIGN_STATUS.DRAFT) {
      return { status: 400, success: false, message: 'Chỉ có thể kích hoạt chiến dịch ở trạng thái nháp' };
    }
    if (new Date(campaign.endDate) <= new Date()) {
      return { status: 400, success: false, message: 'Chiến dịch đã quá ngày kết thúc, không thể kích hoạt' };
    }

    const voucher = await Voucher.findById(campaign.voucherId);
    if (!voucher || voucher.isActive !== 'active') {
      return { status: 400, success: false, message: 'Voucher của chiến dịch không tồn tại hoặc đã bị khóa' };
    }

    // Gom thành viên (union) từ các nhóm mục tiêu
    const segments = await CustomerSegment.find({ _id: { $in: campaign.segmentIds } }).select('memberIds');
    const memberIdSet = new Set();
    for (const segment of segments) {
      for (const memberId of segment.memberIds) {
        memberIdSet.add(memberId.toString());
      }
    }
    const memberIds = [...memberIdSet];

    if (memberIds.length === 0) {
      return { status: 400, success: false, message: 'Các nhóm khách hàng mục tiêu không có thành viên nào' };
    }

    // Kiểm tra kho voucher đủ phát cho toàn bộ thành viên
    const remainingStock = voucher.usageLimit - voucher.issuedCount;
    if (remainingStock < memberIds.length) {
      return {
        status: 400,
        success: false,
        message: `Kho voucher không đủ: cần ${memberIds.length}, còn lại ${remainingStock}. Vui lòng tăng số lượng phát hành của voucher.`,
      };
    }

    // Phát voucher vào ví - unique index (campaignId, customerId) tự bỏ qua khách đã được phát
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
      // insertMany với ordered:false ném lỗi khi có duplicate nhưng vẫn insert các doc hợp lệ
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

    return {
      status: 200,
      success: true,
      message: `Kích hoạt chiến dịch thành công. Đã phát ${issuedCount} voucher vào ví khách hàng.`,
      data: campaign,
    };
  }

  // Hủy chiến dịch đang chạy: thu hồi các voucher đã phát nhưng chưa sử dụng
  static async deactivateCampaign(id) {
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return { status: 404, success: false, message: 'Không tìm thấy chiến dịch' };
    }
    if (campaign.status !== CAMPAIGN_STATUS.ACTIVE) {
      return { status: 400, success: false, message: 'Chỉ có thể hủy chiến dịch đang hoạt động' };
    }

    // Thu hồi: hết hạn ngay lập tức các voucher chưa dùng của chiến dịch
    const revoked = await CustomerVoucher.updateMany(
      { campaignId: campaign._id, isUsed: false },
      { expiryDate: new Date() }
    );

    campaign.status = CAMPAIGN_STATUS.CANCELLED;
    await campaign.save();

    return {
      status: 200,
      success: true,
      message: `Hủy chiến dịch thành công. Đã thu hồi ${revoked.modifiedCount} voucher chưa sử dụng.`,
      data: campaign,
    };
  }

  // Cron 00:00: tự động kết thúc các chiến dịch đã quá hạn
  static async finishExpiredCampaigns() {
    const result = await Campaign.updateMany(
      { status: CAMPAIGN_STATUS.ACTIVE, endDate: { $lt: new Date() } },
      { status: CAMPAIGN_STATUS.FINISHED }
    );
    return { finished: result.modifiedCount };
  }
}

module.exports = CampaignService;
