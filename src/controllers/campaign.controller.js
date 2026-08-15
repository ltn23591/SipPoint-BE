const catchAsync = require('../utils/catchAsync');
const CampaignService = require('../services/campaign.service');

class CampaignController {
  static create = catchAsync(async (req, res, next) => {
    const createdById = req.user ? req.user._id : null;
    const data = await CampaignService.createCampaign(req.body, createdById);
    res.status(201).json({
      success: true,
      message: 'Tạo chiến dịch thành công',
      data,
    });
  });

  static getAll = catchAsync(async (req, res, next) => {
    const result = await CampaignService.getAllCampaigns(req.query);
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách chiến dịch thành công',
      data: result.campaigns,
      pagination: result.pagination,
    });
  });

  static getById = catchAsync(async (req, res, next) => {
    const data = await CampaignService.getCampaignById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy chi tiết chiến dịch thành công',
      data,
    });
  });

  static report = catchAsync(async (req, res, next) => {
    const data = await CampaignService.getCampaignReport(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Lấy báo cáo hiệu quả chiến dịch thành công',
      data,
    });
  });

  static update = catchAsync(async (req, res, next) => {
    const data = await CampaignService.updateCampaign(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Cập nhật chiến dịch thành công',
      data,
    });
  });

  static remove = catchAsync(async (req, res, next) => {
    const data = await CampaignService.deleteCampaign(req.params.id);
    res.status(200).json({
      success: true,
      data,
      message: 'Xóa chiến dịch thành công',
    });
  });

  static activate = catchAsync(async (req, res, next) => {
    const result = await CampaignService.activateCampaign(req.params.id);
    res.status(200).json({
      success: true,
      message: `Kích hoạt chiến dịch thành công. Đã phát ${result.issuedCount} voucher vào ví khách hàng.`,
      data: result.campaign,
    });
  });

  static deactivate = catchAsync(async (req, res, next) => {
    const result = await CampaignService.deactivateCampaign(req.params.id);
    res.status(200).json({
      success: true,
      message: `Hủy chiến dịch thành công. Đã thu hồi ${result.revokedCount} voucher chưa sử dụng.`,
      data: result.campaign,
    });
  });
}

module.exports = CampaignController;
