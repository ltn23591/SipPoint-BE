const { uploadFromBuffer } = require('./cloudinary.service');
const cloudinary = require('../config/cloudinary');

class DocumentService {
  static async uploadSingle(fileBuffer, folder) {
    if (!fileBuffer) {
      throw new Error('Thiếu file buffer');
    }
    const result = await uploadFromBuffer(fileBuffer, folder);
    return result.data;
  }

  static async uploadMultiple(files, folder) {
    if (!files || !files.length) {
      throw new Error('Danh sách file trống');
    }
    const uploadPromises = files.map(file => uploadFromBuffer(file.buffer, folder));
    const results = await Promise.all(uploadPromises);
    return results.map(r => r.data);
  }

  static async deleteFile(publicId) {
    if (!publicId) {
      throw new Error('Thiếu publicId');
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
