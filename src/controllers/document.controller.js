const DocumentService = require('../services/document.service');

exports.uploadFile = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400);
      throw new Error('Vui lòng tải lên một file');
    }
    const data = await DocumentService.uploadSingle(file.buffer, req.body.folder);
    res.status(200).json({
      success: true,
      data,
      message: 'Upload file thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadMultipleFile = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      res.status(400);
      throw new Error('Vui lòng tải lên ít nhất một file');
    }
    const data = await DocumentService.uploadMultiple(files, req.body.folder);
    res.status(200).json({
      success: true,
      data,
      message: 'Upload nhiều file thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const publicId = req.body.publicId || req.body.public_id || req.query.publicId || req.query.public_id;
    if (!publicId) {
      res.status(400);
      throw new Error('Thiếu publicId của file cần xóa');
    }
    const result = await DocumentService.deleteFile(publicId);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Xóa file thành công'
    });
  } catch (error) {
    next(error);
  }
};
