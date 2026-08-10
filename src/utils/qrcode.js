const QRCode = require('qrcode');
const { uploadFromUrl } = require('../services/cloudinary.service');
const logger = require('../config/logger');

const generateQRCode = async (text) => {
  try {
    const dataUrl = await QRCode.toDataURL(text);
    // Upload chuỗi Base64 (Data URL) lên Cloudinary thư mục 'qrcodes'
    try {
      const uploadResult = await uploadFromUrl(dataUrl, 'qrcodes');
      if (uploadResult && uploadResult.secure_url) {
        return uploadResult.secure_url;
      }
    } catch (uploadErr) {
      logger.warn(`[Cloudinary] Không thể upload QR code lên Cloudinary, dùng Base64 fallback: ${uploadErr.message}`);
    }
    return dataUrl;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  generateQRCode,
};

