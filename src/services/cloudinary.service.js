const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const uploadFromUrl = async (url, folder) => {
  if (!url) {
    throw new AppError('Vui lòng cung cấp URL ảnh', 400);
  }
  const options = { resource_type: 'image' };
  if (folder) options.folder = folder;

  const result = await cloudinary.uploader.upload(url, options);
  return result;
};

const uploadFromBuffer = (buffer, folder) => {
  if (!buffer) {
    throw new AppError('File là bắt buộc', 400);
  }
  return new Promise((resolve, reject) => {
    const options = { resource_type: 'image' };
    if (folder) options.folder = folder;

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(buffer);
  });
};

module.exports = { uploadFromUrl, uploadFromBuffer };
