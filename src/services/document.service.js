const { uploadFromBuffer } = require('./cloudinary.service');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

class DocumentService {
  static async uploadSingle(fileBuffer, folder) {
    if (!fileBuffer) {
      throw new AppError('Thiếu file buffer', 400);
    }
    const result = await uploadFromBuffer(fileBuffer, folder);
    return result.data;
  }

  static async uploadMultiple(files, folder) {
    if (!files || !files.length) {
      throw new AppError('Danh sách file trống', 400);
    }
    const uploadPromises = files.map(file => uploadFromBuffer(file.buffer, folder));
    const results = await Promise.all(uploadPromises);
    return results.map(r => r.data);
  }

  static async deleteFile(publicId) {
    if (!publicId) {
      throw new AppError('Thiếu publicId', 400);
    }
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  }
}

module.exports = DocumentService;
