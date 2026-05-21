const cloudinary = require('../config/cloudinary');

const uploadFromUrl = async (url, folder) => {
  if (!url) {
    return { status: 400, success: false, message: 'Vui lòng cung cấp URL ảnh' };
  }
  const options = { resource_type: 'image' };
  if (folder) options.folder = folder;
  
  const result = await cloudinary.uploader.upload(url, options);
  return { status: 200, success: true, data: result, message: 'Upload ảnh thành công' };
};

const uploadFromBuffer = (buffer, folder) => {
  if (!buffer) {
    return { status: 400, success: false, message: 'File là bắt buộc' };
  }
  return new Promise((resolve, reject) => {
    const options = { resource_type: 'image' };
    if (folder) options.folder = folder;

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve({ status: 200, success: true, data: result, message: 'Upload ảnh thành công' });
    });

    stream.end(buffer);
  });
};

module.exports = { uploadFromUrl, uploadFromBuffer };
