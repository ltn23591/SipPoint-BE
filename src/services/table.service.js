const Table = require('../models/table.model');
const { generateQRCode } = require('../utils/qrcode');
const AppError = require('../utils/AppError');

class TableService {
  static async getAll(filter = {}) {
    return await Table.find(filter).populate('zoneId', 'name description');
  }

  static async getById(id) {
    return await Table.findById(id).populate('zoneId', 'name description');
  }

  static async create(data) {
    if (data.name && data.zoneId) {
      const existingTable = await Table.findOne({
        name: data.name.trim(),
        zoneId: data.zoneId,
      });
      if (existingTable) {
        throw new AppError('Tên bàn này đã tồn tại trong khu vực này!', 400);
      }
    }

    // 1. Create table first to get the ID
    const table = new Table(data);
    await table.save();

    // 2. Generate QR code using the ID
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    const qrText = `${frontendUrl}/menu?tableId=${table._id}&zoneId=${table.zoneId}`;
    table.qrCode = await generateQRCode(qrText);
    
    // 3. Save again with QR code
    return await table.save();
  }

  static async update(id, data) {
    // If table is being updated, we check if we need to regenerate QR code (normally QR code is static for the ID, but it's safe to check or preserve)
    const table = await Table.findById(id);
    if (!table) return null;

    const checkName = data.name ? data.name.trim() : (table.name ? table.name : null);
    const checkZone = data.zoneId ? data.zoneId : (table.zoneId ? table.zoneId : null);
    if (checkName && checkZone) {
      const duplicateTable = await Table.findOne({
        name: checkName,
        zoneId: checkZone,
        _id: { $ne: id },
      });
      if (duplicateTable) {
        throw new AppError('Tên bàn này đã tồn tại trong khu vực này!', 400);
      }
    }

    Object.assign(table, data);
    
    // Always ensure QR code is present
    if (!table.qrCode) {
      const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
      const qrText = `${frontendUrl}/menu?tableId=${table._id}&zoneId=${table.zoneId}`;
      table.qrCode = await generateQRCode(qrText);
    }

    return await table.save();
  }

  static async delete(id) {
    return await Table.findByIdAndDelete(id);
  }

  static async generateTableQRCode(id) {
    const table = await Table.findById(id);
    if (!table) throw new AppError('Không tìm thấy bàn', 404);

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '');
    const qrText = `${frontendUrl}/menu?tableId=${table._id}&zoneId=${table.zoneId}`;
    table.qrCode = await generateQRCode(qrText);
    return await table.save();
  }

  static async regenerateAllQRCodes(customFrontendUrl) {
    const tables = await Table.find({});
    const frontendUrl = (customFrontendUrl || process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '');

    let updatedCount = 0;
    for (const table of tables) {
      const qrText = `${frontendUrl}/menu?tableId=${table._id}&zoneId=${table.zoneId}`;
      table.qrCode = await generateQRCode(qrText);
      await table.save();
      updatedCount++;
    }
    return { count: updatedCount, frontendUrl };
  }
}

module.exports = TableService;
