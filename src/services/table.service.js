const Table = require('../models/table.model');
const { generateQRCode } = require('../utils/qrcode');

class TableService {
  static async getAll(filter = {}) {
    return await Table.find(filter).populate('zoneId', 'name description');
  }

  static async getById(id) {
    return await Table.findById(id).populate('zoneId', 'name description');
  }

  static async create(data) {
    // 1. Create table first to get the ID
    const table = new Table(data);
    await table.save();

    // 2. Generate QR code using the ID
    const qrText = `/order?tableId=${table._id}`;
    table.qrCode = await generateQRCode(qrText);
    
    // 3. Save again with QR code
    return await table.save();
  }

  static async update(id, data) {
    // If table is being updated, we check if we need to regenerate QR code (normally QR code is static for the ID, but it's safe to check or preserve)
    const table = await Table.findById(id);
    if (!table) return null;

    Object.assign(table, data);
    
    // Always ensure QR code is present
    if (!table.qrCode) {
      const qrText = `/order?tableId=${table._id}`;
      table.qrCode = await generateQRCode(qrText);
    }

    return await table.save();
  }

  static async delete(id) {
    return await Table.findByIdAndDelete(id);
  }

  static async generateTableQRCode(id) {
    const table = await Table.findById(id);
    if (!table) throw new Error('Không tìm thấy bàn');

    const qrText = `/order?tableId=${table._id}`;
    table.qrCode = await generateQRCode(qrText);
    return await table.save();
  }
}

module.exports = TableService;
