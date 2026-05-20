const CloudinaryService = require('../services/cloudinary.service');

// @desc    Upload ảnh từ URL lên Cloudinary
// @route   POST /api/v1/cloudinary/upload-url
// @access  Public
exports.uploadFromUrl = async (req, res, next) => {
  try {
    const { url, folder } = req.body;

    if (!url) {
      res.status(400);
      throw new Error('URL là bắt buộc');
    }

    const result = await CloudinaryService.uploadFromUrl(url, folder);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Upload ảnh thành công'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload ảnh từ file lên Cloudinary
// @route   POST /api/v1/cloudinary/upload-file
// @access  Public
exports.uploadFromFile = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('File là bắt buộc');
    }

    const folder = req.body.folder;
    const result = await CloudinaryService.uploadFromBuffer(req.file.buffer, folder);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Upload ảnh thành công'
    });
  } catch (error) {
    next(error);
  }
};
