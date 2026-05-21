const CloudinaryService = require('../services/cloudinary.service');

// @desc    Upload ảnh từ URL lên Cloudinary
// @route   POST /api/v1/upload/cloudinary/url
// @access  Private
exports.uploadFromUrl = async (req, res, next) => {
  try {
    const result = await CloudinaryService.uploadFromUrl(req.body.url, req.body.folder);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload ảnh từ file lên Cloudinary
// @route   POST /api/v1/upload/cloudinary/file
// @access  Private
exports.uploadFromFile = async (req, res, next) => {
  try {
    const buffer = req.file ? req.file.buffer : null;
    const result = await CloudinaryService.uploadFromBuffer(buffer, req.body.folder);
    return res.status(result.status).json(result);
  } catch (error) {
    next(error);
  }
};
