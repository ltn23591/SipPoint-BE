const Material = require('../models/material.model');
const StockMovement = require('../models/stockMovement.model');
const Product = require('../models/product.model');
const ProductRecipe = require('../models/productRecipe.model');
const AppError = require('../utils/AppError');
const NotificationService = require('./notification.service');
const { emitToAll } = require('./socket.service');
const { MATERIAL_STOCK_STATUS, PRODUCT_STOCK_STATUS, STOCK_MOVEMENT_TYPE } = require('../enums');

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

    // Đồng bộ trạng thái còn/hết hàng của các sản phẩm dùng nguyên liệu này
    await this.recomputeProductsForMaterial(updated._id);

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

  // ==== Xử lý đơn hàng: Hold / Commit / Rollback (Giai đoạn 2) ====

  /**
   * Tập hợp các productId có công thức đang hoạt động
   */
  static async getRecipeProductIdSet(productIds = []) {
    const ids = [...new Set(productIds.map((id) => String(id)))];
    if (ids.length === 0) return new Set();
    const recipes = await ProductRecipe.find({
      productId: { $in: ids },
      isActive: 'active',
    })
      .select('productId')
      .lean();
    return new Set(recipes.map((r) => String(r.productId)));
  }

  /**
   * Bản đồ productId -> danh sách nguyên liệu công thức (kèm tên & đơn vị) để snapshot vào OrderItem.
   */
  static async getRecipeMaterialsMap(productIds = []) {
    const ids = [...new Set(productIds.map((id) => String(id)))];
    const map = new Map();
    if (ids.length === 0) return map;

    const recipes = await ProductRecipe.find({
      productId: { $in: ids },
      isActive: 'active',
    }).lean();
    const matIds = [
      ...new Set(recipes.flatMap((r) => r.items.map((i) => String(i.materialId)))),
    ];
    const materials = await Material.find({ _id: { $in: matIds } })
      .select('name unit')
      .lean();
    const matById = new Map(materials.map((m) => [String(m._id), m]));

    for (const recipe of recipes) {
      map.set(
        String(recipe.productId),
        recipe.items.map((line) => {
          const m = matById.get(String(line.materialId));
          return {
            materialId: line.materialId,
            name: m ? m.name : '',
            unit: m ? m.unit : '',
            quantityPerUnit: line.quantity,
          };
        })
      );
    }
    return map;
  }

  /**
   * TẠM GIỮ (HOLD) nguyên liệu cho đơn hàng theo công thức - nguyên tử, all-or-nothing.
   * items: [{ productId, qty }].
   * Trả về { holds: [{ materialId, quantity }], recipeProductIds: [...] }.
   * Nếu thiếu nguyên liệu: nhả các phần đã giữ, đánh dấu sản phẩm liên quan "Hết hàng",
   * gửi cảnh báo và ném AppError.
   */
  static async holdForOrder(items = [], employeeId) {
    const productIds = [...new Set(items.map((i) => String(i.productId)))];
    const recipes = await ProductRecipe.find({
      productId: { $in: productIds },
      isActive: 'active',
    }).lean();

    const recipeByProduct = new Map(recipes.map((r) => [String(r.productId), r]));
    const recipeProductIds = recipes.map((r) => String(r.productId));

    // Gộp nhu cầu nguyên liệu toàn đơn + ghi nhận sản phẩm nào phụ thuộc nguyên liệu nào
    const needByMaterial = new Map();
    const productsByMaterial = new Map();
    for (const item of items) {
      const recipe = recipeByProduct.get(String(item.productId));
      if (!recipe) continue; // Sản phẩm không công thức -> xử lý qua product.stock
      const qty = Number(item.qty) || 0;
      for (const line of recipe.items) {
        const mId = String(line.materialId);
        needByMaterial.set(mId, (needByMaterial.get(mId) || 0) + line.quantity * qty);
        if (!productsByMaterial.has(mId)) productsByMaterial.set(mId, new Set());
        productsByMaterial.get(mId).add(String(item.productId));
      }
    }

    if (needByMaterial.size === 0) {
      return { holds: [], recipeProductIds };
    }

    // Giữ chỗ nguyên tử từng nguyên liệu; nếu một cái thiếu -> rollback toàn bộ
    const held = [];
    for (const [materialId, need] of needByMaterial.entries()) {
      const updated = await Material.findOneAndUpdate(
        {
          _id: materialId,
          isDeleted: false,
          isActive: 'active',
          $expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, need] },
        },
        { $inc: { reserved: need } },
        { new: true }
      );

      if (!updated) {
        // Nhả các nguyên liệu đã giữ trong lần thử này
        for (const h of held) {
          await Material.updateOne({ _id: h.materialId }, { $inc: { reserved: -h.quantity } });
        }
        // Đánh dấu sản phẩm liên quan là Hết hàng + cảnh báo
        const material = await Material.findById(materialId).lean();
        const affectedProductIds = [...(productsByMaterial.get(materialId) || [])];
        await this.markProductsOutOfStock(affectedProductIds, material, employeeId);
        throw new AppError(
          `Không đủ nguyên liệu${material ? ` "${material.name}"` : ''} để phục vụ đơn hàng. Một số món đã được chuyển sang trạng thái Hết hàng.`,
          400
        );
      }

      held.push({ materialId, quantity: need });
    }

    // Giữ chỗ thành công -> đảm bảo các sản phẩm vừa đặt đang ở trạng thái Còn hàng
    await this.markProductsInStock(recipeProductIds);

    return { holds: held, recipeProductIds };
  }

  /**
   * TRỪ KHO CHÍNH THỨC (COMMIT) khi đơn hoàn tất: onHand -= q, reserved -= q, ghi CONSUME.
   */
  static async commitHolds(holds = [], orderId, employeeId) {
    for (const h of holds) {
      // Trừ tồn thực tế + ghi sổ cái + cập nhật trạng thái/cảnh báo (tái dùng adjustStock)
      await this.adjustStock(
        h.materialId,
        -h.quantity,
        STOCK_MOVEMENT_TYPE.CONSUME,
        'Trừ kho khi hoàn tất đơn hàng',
        employeeId,
        { orderId }
      );
      // Nhả phần tạm giữ tương ứng
      const res = await Material.updateOne(
        { _id: h.materialId, reserved: { $gte: h.quantity } },
        { $inc: { reserved: -h.quantity } }
      );
      if (res.modifiedCount === 0) {
        await Material.updateOne({ _id: h.materialId }, { reserved: 0 });
      }
    }
  }

  /**
   * HOÀN TÁC (RELEASE) khi hủy đơn chưa trừ kho: chỉ nhả phần tạm giữ (onHand không đổi).
   */
  static async releaseHolds(holds = []) {
    for (const h of holds) {
      const res = await Material.updateOne(
        { _id: h.materialId, reserved: { $gte: h.quantity } },
        { $inc: { reserved: -h.quantity } }
      );
      if (res.modifiedCount === 0) {
        await Material.updateOne({ _id: h.materialId, reserved: { $gt: 0 } }, { reserved: 0 });
      }
    }
  }

  /**
   * HOÀN KHO (RESTOCK) khi hoàn trả đơn đã trừ kho: onHand += q, ghi RESTOCK.
   */
  static async restockHolds(holds = [], orderId, employeeId) {
    for (const h of holds) {
      await this.adjustStock(
        h.materialId,
        h.quantity,
        STOCK_MOVEMENT_TYPE.RESTOCK,
        'Hoàn kho khi hoàn trả đơn hàng',
        employeeId,
        { orderId }
      );
    }
  }

  /**
   * Đánh dấu sản phẩm "Hết hàng" (do thiếu nguyên liệu) + gửi cảnh báo
   */
  static async markProductsOutOfStock(productIds = [], material, employeeId) {
    if (!productIds || productIds.length === 0) return;

    await Product.updateMany(
      { _id: { $in: productIds }, stockStatus: { $ne: PRODUCT_STOCK_STATUS.OUT_OF_STOCK } },
      { stockStatus: PRODUCT_STOCK_STATUS.OUT_OF_STOCK }
    );

    const products = await Product.find({ _id: { $in: productIds } }).select('name').lean();
    for (const p of products) {
      try {
        await NotificationService.createNotification(
          {
            title: `Món hết hàng: ${p.name}`,
            content: `Món "${p.name}" đã chuyển sang trạng thái Hết hàng do không đủ nguyên liệu${material ? ` "${material.name}"` : ''}. Vui lòng nhập thêm nguyên liệu.`,
            type: 'inventory',
            recipientType: 'staff',
          },
          employeeId
        );
      } catch (error) {
        console.error('❌ [Inventory] Lỗi lưu thông báo món hết hàng:', error.message);
      }
    }

    emitToAll('product_out_of_stock', {
      productIds,
      materialId: material ? material._id : null,
      materialName: material ? material.name : null,
    });
  }

  /**
   * Đưa sản phẩm trở lại trạng thái "Còn hàng" (chỉ với sản phẩm đang bị đánh dấu hết hàng)
   */
  static async markProductsInStock(productIds = []) {
    if (!productIds || productIds.length === 0) return;
    await Product.updateMany(
      { _id: { $in: productIds }, stockStatus: PRODUCT_STOCK_STATUS.OUT_OF_STOCK },
      { stockStatus: PRODUCT_STOCK_STATUS.IN_STOCK }
    );
  }

  /**
   * Tính số phần còn làm được (max makeable) cho từng sản phẩm theo công thức & tồn khả dụng.
   * productIds: danh sách ObjectId/string. Trả về [{ productId, hasRecipe, makeable, stockStatus }].
   * SP không công thức -> hasRecipe=false, makeable=null (tồn kho quản lý qua product.stock).
   */
  static async getProductsAvailability(productIds = []) {
    const ids = [...new Set(productIds.map((id) => String(id)))];
    if (ids.length === 0) return [];

    const recipes = await ProductRecipe.find({
      productId: { $in: ids },
      isActive: 'active',
    }).lean();
    const recipeByProduct = new Map(recipes.map((r) => [String(r.productId), r]));

    const matIds = [
      ...new Set(recipes.flatMap((r) => r.items.map((i) => String(i.materialId)))),
    ];
    const materials = await Material.find({ _id: { $in: matIds } }).lean();
    const matById = new Map(materials.map((m) => [String(m._id), m]));

    return ids.map((pid) => {
      const recipe = recipeByProduct.get(pid);
      if (!recipe || recipe.items.length === 0) {
        return { productId: pid, hasRecipe: false, makeable: null, stockStatus: null };
      }
      let makeable = Infinity;
      for (const line of recipe.items) {
        const m = matById.get(String(line.materialId));
        if (!m || m.isDeleted || m.isActive !== 'active') {
          makeable = 0;
          break;
        }
        const available = Math.max(0, (m.onHand || 0) - (m.reserved || 0));
        const per = line.quantity || 0;
        const canMake = per > 0 ? Math.floor(available / per) : Infinity;
        makeable = Math.min(makeable, canMake);
      }
      if (!isFinite(makeable)) makeable = 0;
      return {
        productId: pid,
        hasRecipe: true,
        makeable,
        stockStatus: makeable > 0 ? PRODUCT_STOCK_STATUS.IN_STOCK : PRODUCT_STOCK_STATUS.OUT_OF_STOCK,
      };
    });
  }

  /**
   * Đồng bộ lại stockStatus của các sản phẩm dùng nguyên liệu này theo khả năng làm được.
   * Gọi sau mỗi biến động tồn kho: tự đưa SP về in_stock khi nhập đủ, hoặc out_of_stock khi cạn.
   */
  static async recomputeProductsForMaterial(materialId) {
    const recipes = await ProductRecipe.find({
      'items.materialId': materialId,
      isActive: 'active',
    })
      .select('productId')
      .lean();
    const productIds = recipes.map((r) => String(r.productId));
    if (productIds.length === 0) return;

    const availability = await this.getProductsAvailability(productIds);
    for (const a of availability) {
      if (!a.hasRecipe) continue;
      await Product.updateOne(
        { _id: a.productId, stockStatus: { $ne: a.stockStatus } },
        { stockStatus: a.stockStatus }
      );
    }
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
