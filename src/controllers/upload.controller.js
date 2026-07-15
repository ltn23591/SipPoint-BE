const catchAsync = require('../utils/catchAsync');
const CloudinaryService = require('../services/cloudinary.service');

// @desc    Upload ảnh từ URL lên Cloudinary
// @route   POST /api/v1/upload/cloudinary/url
// @access  Private
exports.uploadFromUrl = catchAsync(async (req, res, next) => {
  const result = await CloudinaryService.uploadFromUrl(req.body.url, req.body.folder);
    return res.status(result.status).json(result);
});;

// @desc    Upload ảnh từ file lên Cloudinary
// @route   POST /api/v1/upload/cloudinary/file
// @access  Private
exports.uploadFromFile = catchAsync(async (req, res, next) => {
  const buffer = req.file ? req.file.buffer : null;
    const result = await CloudinaryService.uploadFromBuffer(buffer, req.body.folder);
    return res.status(result.status).json(result);
});;
