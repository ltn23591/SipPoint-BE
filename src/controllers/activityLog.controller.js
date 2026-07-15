const catchAsync = require('../utils/catchAsync');
const ActivityLogService = require('../services/activityLog.service');

exports.search = catchAsync(async (req, res, next) => {
  const result = await ActivityLogService.searchLogs(req.body);
    res.status(200).json(result);
});;
