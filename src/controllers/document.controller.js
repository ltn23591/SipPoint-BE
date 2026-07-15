const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const DocumentService = require('../services/document.service');

exports.uploadFile = catchAsync(async (req, res, next) => {
  const file = req.file;
    if (!file) {
      return next(new AppError('Vui lòng tải lên một file', 400));
    }
    const data = await DocumentService.uploadSingle(file.buffer, req.body.folder);
    res.status(200).json({
      success: true,
      data,
      message: 'Upload file thành công'
    });
});;

exports.uploadMultipleFile = catchAsync(async (req, res, next) => {
  const files = req.files;
    if (!files || files.length === 0) {
      return next(new AppError('Vui lòng tải lên ít nhất một file', 400));
    }
    const data = await DocumentService.uploadMultiple(files, req.body.folder);
    res.status(200).json({
      success: true,
      data,
      message: 'Upload nhiều file thành công'
    });
});;

exports.deleteFile = catchAsync(async (req, res, next) => {
  const publicId = req.body.publicId || req.body.public_id || req.query.publicId || req.query.public_id;
    if (!publicId) {
      return next(new AppError('Thiếu publicId của file cần xóa', 400));
    }
    const result = await DocumentService.deleteFile(publicId);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Xóa file thành công'
    });
});;
