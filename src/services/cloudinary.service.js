const cloudinary = require('../config/cloudinary');

const uploadFromUrl = async (url, folder) => {
  const options = { resource_type: 'image' };
  if (folder) options.folder = folder;
  return await cloudinary.uploader.upload(url, options);
};

const uploadFromBuffer = (buffer, folder) => {
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
