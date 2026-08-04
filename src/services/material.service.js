const Material = require('../models/material.model');
const StockMovement = require('../models/stockMovement.model');
const AppError = require('../utils/AppError');
const NotificationService = require('./notification.service');
const { emitToAll } = require('./socket.service');
const { MATERIAL_STOCK_STATUS, STOCK_MOVEMENT_TYPE } = require('../enums');

// Thứ tự mức độ nghiêm trọng của trạng thái tồn kho (dùng để quyết định có cảnh báo hay không)
const STATUS_SEVERITY = {
  [MATERIAL_STOCK_STATUS.IN_STOCK]: 0,
  [MATERIAL_STOCK_STATUS.LOW]: 1,
  [MATERIAL_STOCK_STATUS.OUT_OF_STOCK]: 2,
};

class MaterialService {
  /**
   * Lấy danh sách nguyên liệu (lọc + tìm kiếm + phân trang)
   */
  static async getAll(query = {}) {
    const { status, keyword, isActive, page = 1, limit = 20 } = query;

    const filter = {};
    if (query.includeDeleted === 'true' || query.includeDeleted === true) {
      // Bao gồm cả nguyên liệu đã xóa
    } else if (query.isDeleted === 'true' || query.isDeleted === true) {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = { $ne: true };
    }

    if (status) filter.status = status;
    if (isActive) filter.isActive = isActive;
    if (keyword) filter.name = { $regex: keyword, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const materials = await Material.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Material.countDocuments(filter);

    return {
      materials,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Lấy chi tiết một nguyên liệu
   */
  static async getById(id) {
    const material = await Material.findById(id);
    if (!material || material.isDeleted) return null;
    return material;
  }

  /**
   * Tạo nguyên liệu mới
   */
  static async create(body, employeeId) {
    const { name, code, unit, onHand, minThreshold, cost, isActive } = body;

    const material = new Material({
      name,
      code: code || undefined,
      unit,
      onHand: Number(onHand) || 0,
      minThreshold: Number(minThreshold) || 0,
      cost: Number(cost) || 0,
      isActive: isActive || 'active',
      createdBy: employeeId || null,
    });

    // Tính trạng thái ban đầu theo tồn kho
    material.status = this.computeStatus(material.onHand, material.minThreshold);
    await material.save();

    // Nếu tạo với tồn kho ban đầu > 0, ghi nhận một bút toán nhập kho
    if (material.onHand > 0) {
      await StockMovement.create({
        materialId: material._id,
        type: STOCK_MOVEMENT_TYPE.IMPORT,
        quantityChange: material.onHand,
        balanceAfter: material.onHand,
        note: 'Tồn kho khởi tạo',
        createdBy: employeeId || null,
      });
    }

    return material;
  }

  /**
   * Cập nhật thông tin nguyên liệu (không đổi tồn kho trực tiếp - dùng adjustStock/importStock)
   */
  static async update(id, body, employeeId) {
    const { name, code, unit, minThreshold, cost, isActive } = body;

    const material = await Material.findOne({ _id: id, isDeleted: false });
    if (!material) return null;

    if (name !== undefined) material.name = name;
    if (code !== undefined) material.code = code || undefined;
    if (unit !== undefined) material.unit = unit;
    if (minThreshold !== undefined) material.minThreshold = Number(minThreshold) || 0;
    if (cost !== undefined) material.cost = Number(cost) || 0;
    if (isActive !== undefined) material.isActive = isActive;
    material.updatedBy = employeeId || material.updatedBy;

    // Ngưỡng cảnh báo có thể thay đổi -> tính lại trạng thái
    const prevStatus = material.status;
    material.status = this.computeStatus(material.onHand, material.minThreshold);
    await material.save();

    await this.maybeAlert(material, prevStatus, employeeId);
    return material;
  }

  /**
   * Xóa mềm nguyên liệu
   */
  static async remove(id) {
    return await Material.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, isActive: 'inactive' },
      { new: true }
    );
  }

  /**
   * Khôi phục nguyên liệu đã xóa mềm
   */
  static async restore(id) {
    return await Material.findByIdAndUpdate(
      id,
      { isDeleted: false, isActive: 'active' },
      { new: true }
    );
  }

  /**
   * Nguyên thủy điều chỉnh tồn kho: cập nhật onHand nguyên tử (chống âm kho),
   * ghi sổ cái và cập nhật trạng thái + cảnh báo. Tái sử dụng cho nhập kho/kiểm kê (và Giai đoạn 2).
   */
  static async adjustStock(materialId, quantityChange, type, note, employeeId, extra = {}) {
    const change = Number(quantityChange);
    if (!change || isNaN(change)) {
      throw new AppError('Lượng biến động tồn kho không hợp lệ', 400);
    }

    const material = await Material.findOne({ _id: materialId, isDeleted: false });
    if (!material) {
      throw new AppError('Không tìm thấy nguyên liệu', 404);
    }

    const prevStatus = material.status;

    // Guard nguyên tử: khi trừ kho, chỉ cập nhật nếu tồn hiện tại đủ (tránh âm kho & race condition)
    const filter = { _id: materialId, isDeleted: false };
    if (change < 0) {
      filter.onHand = { $gte: -change };
    }

    const updated = await Material.findOneAndUpdate(
      filter,
      { $inc: { onHand: change }, updatedBy: employeeId || material.updatedBy },
      { new: true }
    );

    if (!updated) {
      throw new AppError(
        `Tồn kho không đủ để điều chỉnh (hiện có ${material.onHand} ${material.unit})`,
        400
      );
    }

    // Ghi sổ cái biến động tồn kho
    await StockMovement.create({
      materialId: updated._id,
      type: type || STOCK_MOVEMENT_TYPE.ADJUSTMENT,
      quantityChange: change,
      balanceAfter: updated.onHand,
      orderId: extra.orderId || null,
      note: note || '',
      createdBy: employeeId || null,
    });

    // Cập nhật trạng thái tồn kho + cảnh báo nếu tụt xuống mức thấp/hết
    const newStatus = this.computeStatus(updated.onHand, updated.minThreshold);
    if (newStatus !== updated.status) {
      updated.status = newStatus;
      await Material.updateOne({ _id: updated._id }, { status: newStatus });
    }
    await this.maybeAlert(updated, prevStatus, employeeId);

    return updated;
  }

  /**
   * Nhập kho (wrapper của adjustStock với loại IMPORT). Cho phép cập nhật giá vốn kèm theo.
   */
  static async importStock(materialId, quantity, note, employeeId, cost) {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      throw new AppError('Số lượng nhập kho phải lớn hơn 0', 400);
    }

    if (cost !== undefined && cost !== null && cost !== '') {
      await Material.updateOne(
        { _id: materialId, isDeleted: false },
        { cost: Number(cost) || 0 }
      );
    }

    return await this.adjustStock(
      materialId,
      qty,
      STOCK_MOVEMENT_TYPE.IMPORT,
      note || 'Nhập kho',
      employeeId
    );
  }

  /**
   * Lịch sử biến động tồn kho của một nguyên liệu
   */
  static async getMovements(materialId, query = {}) {
    const { type, page = 1, limit = 20 } = query;
    const filter = { materialId };
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const movements = await StockMovement.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await StockMovement.countDocuments(filter);

    return {
      movements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Danh sách nguyên liệu sắp hết / đã hết (cho dashboard & cron cảnh báo)
   */
  static async getLowStockMaterials() {
    return await Material.find({
      isDeleted: { $ne: true },
      isActive: 'active',
      status: { $in: [MATERIAL_STOCK_STATUS.LOW, MATERIAL_STOCK_STATUS.OUT_OF_STOCK] },
    }).sort({ status: -1, onHand: 1 });
  }

  // ==== Helpers ====

  /**
   * Suy ra trạng thái tồn kho từ tồn thực tế và ngưỡng cảnh báo
   */
  static computeStatus(onHand, minThreshold) {
    if (onHand <= 0) return MATERIAL_STOCK_STATUS.OUT_OF_STOCK;
    if (onHand <= (minThreshold || 0)) return MATERIAL_STOCK_STATUS.LOW;
    return MATERIAL_STOCK_STATUS.IN_STOCK;
  }

  /**
   * Chỉ gửi cảnh báo khi trạng thái xấu đi (in_stock -> low/out, low -> out) để tránh spam
   */
  static async maybeAlert(material, prevStatus, employeeId) {
    const prevSeverity = STATUS_SEVERITY[prevStatus] ?? 0;
    const newSeverity = STATUS_SEVERITY[material.status] ?? 0;
    if (newSeverity > prevSeverity && newSeverity >= 1) {
      await this.sendLowStockAlert(material, employeeId);
    }
  }

  /**
   * Lưu thông báo + phát realtime khi nguyên liệu sắp/hết hàng
   */
  static async sendLowStockAlert(material, employeeId) {
    const isOut = material.status === MATERIAL_STOCK_STATUS.OUT_OF_STOCK;
    const title = isOut
      ? `Hết nguyên liệu: ${material.name}`
      : `Sắp hết nguyên liệu: ${material.name}`;
    const content = isOut
      ? `Nguyên liệu "${material.name}" đã hết hàng. Vui lòng nhập thêm để tránh gián đoạn phục vụ.`
      : `Nguyên liệu "${material.name}" sắp hết (còn ${material.onHand}/${material.minThreshold} ${material.unit}). Vui lòng nhập thêm hàng.`;

    try {
      await NotificationService.createNotification(
        { title, content, type: 'inventory', recipientType: 'staff' },
        employeeId
      );
    } catch (error) {
      console.error('❌ [Inventory] Lỗi lưu thông báo cảnh báo tồn kho:', error.message);
    }

    emitToAll('low_stock', {
      materialId: material._id,
      name: material.name,
      unit: material.unit,
      onHand: material.onHand,
      minThreshold: material.minThreshold,
      status: material.status,
    });
  }
}

module.exports = MaterialService;
