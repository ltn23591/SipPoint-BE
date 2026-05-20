const QRCode = require('qrcode');

const generateQRCode = async (text) => {
  try {
    const qrImage = await QRCode.toDataURL(text);
    return qrImage;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  generateQRCode,
};
