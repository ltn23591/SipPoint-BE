const ActivityLogService = require('../services/activityLog.service');

exports.search = async (req, res, next) => {
  try {
    const result = await ActivityLogService.searchLogs(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
