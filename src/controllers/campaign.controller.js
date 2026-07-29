const catchAsync = require('../utils/catchAsync');
const CampaignService = require('../services/campaign.service');

class CampaignController {
  static create = catchAsync(async (req, res, next) => {
      const createdById = req.user ? req.user._id : null;
      const result = await CampaignService.createCampaign(req.body, createdById);
      res.status(result.status || 200).json(result);
    });

  static getAll = catchAsync(async (req, res, next) => {
      const result = await CampaignService.getAllCampaigns(req.query);
      res.status(result.status || 200).json(result);
    });

  static getById = catchAsync(async (req, res, next) => {
      const result = await CampaignService.getCampaignById(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static update = catchAsync(async (req, res, next) => {
      const result = await CampaignService.updateCampaign(req.params.id, req.body);
      res.status(result.status || 200).json(result);
    });

  static remove = catchAsync(async (req, res, next) => {
      const result = await CampaignService.deleteCampaign(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static activate = catchAsync(async (req, res, next) => {
      const result = await CampaignService.activateCampaign(req.params.id);
      res.status(result.status || 200).json(result);
    });

  static deactivate = catchAsync(async (req, res, next) => {
      const result = await CampaignService.deactivateCampaign(req.params.id);
      res.status(result.status || 200).json(result);
    });
}

module.exports = CampaignController;
