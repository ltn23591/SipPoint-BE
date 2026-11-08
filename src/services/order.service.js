const AppError = require('../utils/AppError');
const Order = require('../models/order.model');
const { OrderItem } = require('../models/orderItem.model');
const Product = require('../models/product.model');
const ProductVariant = require('../models/productVariant.model');
const Table = require('../models/table.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const Customer = require('../models/customer.model');
const VoucherService = require('./voucher.service');
const CustomerService = require('./customer.service');
const MaterialService = require('./material.service');
const GameService = require('./game.service');
const { ORDER_STATUS, TABLE_STATUS, IS_ACTIVE, POINT_TRANSACTION_TYPE, POINTS_RATE, PAYMENT_METHOD, GAME_ACTIVITY_TYPE, CUSTOMER_TYPE } = require('../enums');
const { emitToAll } = require('./socket.service');
const mongoose = require('mongoose');

const ORDER_ITEMS_POPULATE = {
  path: 'items',
  populate: { path: 'productId', select: 'name image price' },
};

class OrderService {

  static async createOrder(data, createdById) {
    const { tableId, customerId, items, voucherCode, customerVoucherId, note } = data;

    if (voucherCode && customerVoucherId) {
      throw new AppError('Chỉ được áp dụng một loại voucher cho mỗi đơn hàng', 400);
    }

    let resolvedCustomerId = null;
    if (customerId) {
      if (mongoose.Types.ObjectId.isValid(customerId)) {
        resolvedCustomerId = customerId;
      } else {
        const customerObj = await Customer.findOne({ customerId: customerId });
        if (customerObj) {
          resolvedCustomerId = customerObj._id;
        } else {
          throw new AppError(`Không tìm thấy khách hàng với mã số ${customerId}`, 404);
        }
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Đơn hàng phải chứa ít nhất một món ăn/đồ uống', 400);
    }

    for (const item of items) {
      if (!item.productId) {
        throw new AppError('Mã sản phẩm (productId) là bắt buộc', 400);
      }
      if (item.qty === undefined || item.qty === null || isNaN(item.qty) || parseInt(item.qty) < 1) {
        throw new AppError('Số lượng món ăn/đồ uống phải lớn hơn hoặc bằng 1', 400);
      }
    }

    if (tableId) {
      const table = await Table.findById(tableId);
      if (!table) {
        throw new AppError('Không tìm thấy bàn yêu cầu', 404);
      }
    }

    const orderItemsToCreate = [];
    let subtotalSum = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.isDeleted || product.isActive === 'inactive' || product.isActive === 0) {
        throw new AppError(`Món "${product ? product.name : 'không xác định'}" hiện đã ngừng kinh doanh. Vui lòng cập nhật lại giỏ hàng.`, 400);
      }

      const itemVariants = [];
      let variantPriceSum = 0;

      if (item.variants && Array.isArray(item.variants)) {
        for (const v of item.variants) {
          const variant = await ProductVariant.findById(v.variantId);
          if (!variant || variant.isActive === 0) {
            throw new AppError(`Biến thể với ID ${v.variantId} không tồn tại hoặc đã ngừng hoạt động`, 404);
          }
          itemVariants.push({
            variantId: variant._id,
            name: variant.name,
            priceAdjustment: variant.priceAdjustment,
          });
          variantPriceSum += variant.priceAdjustment;
        }
      }
      const itemPrice = product.price;
      const quantity = parseInt(item.qty) || 1;
      const itemSubtotal = (itemPrice + variantPriceSum) * quantity;

      orderItemsToCreate.push({
        productId: product._id,
        name: product.name,
        unitPrice: itemPrice,
        qty: quantity,
        variants: itemVariants,
        note: item.note || '',
        subtotal: itemSubtotal,
      });

      subtotalSum += itemSubtotal;
    }

    let discountAmount = 0;
    let finalAmount = subtotalSum;
    let resolvedVoucherId = null;

    if (voucherCode) {
      const voucherObj = await Voucher.findOne({ code: voucherCode.toUpperCase() });
      if (!voucherObj) {
        throw new AppError('Voucher không tồn tại', 404);
      }
      resolvedVoucherId = voucherObj._id;

      // Giới hạn số lần sử dụng trên mỗi khách hàng (không tính đơn đã hủy/hoàn trả)
      if (voucherObj.perCustomerLimit > 0 && resolvedCustomerId) {
        const usedByCustomer = await Order.countDocuments({
          customerId: resolvedCustomerId,
          voucherId: voucherObj._id,
          status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] },
        });
        if (usedByCustomer >= voucherObj.perCustomerLimit) {
          throw new AppError('Bạn đã đạt giới hạn sử dụng mã giảm giá này', 400);
        }
      }

      const voucherRes = await VoucherService.validateVoucher(voucherCode, subtotalSum);
      discountAmount = voucherRes.discountAmount;
      finalAmount = voucherRes.finalAmount;

      // Cập nhật lượt sử dụng atomic - thất bại nghĩa là voucher vừa hết lượt (race).
      // Kho dùng chung giữa 2 kênh (nhập mã + phát vào ví) - xem VoucherService.stockAvailableFilter.
      const claimed = await Voucher.findOneAndUpdate(
        {
          code: voucherCode.toUpperCase(),
          isActive: 'active',
          ...VoucherService.stockAvailableFilter(),
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      );
      if (!claimed) {
        throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
      }
    }

    // 3b. Xử lý voucher trong ví khách hàng (phát từ campaign hoặc đổi điểm)
    let claimedWalletVoucherId = null;
    if (customerVoucherId) {
      if (!resolvedCustomerId) {
        throw new AppError('Đơn hàng phải gắn với khách hàng để dùng voucher trong ví', 400);
      }

      const walletRes = await VoucherService.validateWalletVoucher(customerVoucherId, resolvedCustomerId, subtotalSum);
      discountAmount = walletRes.discountAmount;
      finalAmount = walletRes.finalAmount;
      resolvedVoucherId = walletRes.voucherId;

      // Claim atomic - chống dùng cùng lúc trên 2 đơn (kho voucher đã trừ lúc phát, KHÔNG tăng usedCount)
      const claimedWallet = await CustomerVoucher.findOneAndUpdate(
        { _id: customerVoucherId, customerId: resolvedCustomerId, isUsed: false },
        { isUsed: true, usedAt: new Date() },
        { new: true }
      );
      if (!claimedWallet) {
        throw new AppError('Voucher đã được sử dụng, vui lòng thử lại', 400);
      }
      claimedWalletVoucherId = claimedWallet._id;
    }

    // 3c. TẠM GIỮ (HOLD) nguyên liệu theo công thức - kiểm tra đủ hàng & lock trước khi tạo đơn.
    // Nếu thiếu nguyên liệu: bù trừ voucher đã claim rồi ném lỗi (hệ thống tự đánh dấu món Hết hàng).
    let heldMaterials = [];
    let recipeProductIds = new Set();
    try {
      const holdResult = await MaterialService.holdForOrder(orderItemsToCreate, createdById);
      heldMaterials = holdResult.holds;
      recipeProductIds = new Set(holdResult.recipeProductIds);
    } catch (holdError) {
      if (claimedWalletVoucherId) {
        await CustomerVoucher.updateOne(
          { _id: claimedWalletVoucherId },
          { isUsed: false, $unset: { usedAt: 1, orderId: 1 } }
        );
      } else if (voucherCode && resolvedVoucherId) {
        await Voucher.updateOne(
          { _id: resolvedVoucherId, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      }
      throw holdError;
    }

    // 4. Sinh mã đơn hàng ngẫu nhiên duy nhất
    const code = `OD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase();

    // 5. Tạo đơn hàng mới
    let order;
    try {
      order = await Order.create({
        code,
        orderNumber: code,
        tableId: tableId || null,
        customerId: resolvedCustomerId || null,
        customerType: resolvedCustomerId ? CUSTOMER_TYPE.MEMBER : CUSTOMER_TYPE.GUEST,
        voucherId: resolvedVoucherId,
        customerVoucherId: claimedWalletVoucherId,
        subtotal: subtotalSum,
        discount: discountAmount,
        total: finalAmount,
        status: ORDER_STATUS.PENDING,
        note: note || '',
        createdBy: createdById || null,
        isUrgent: data.isUrgent || false,
        isPaid: data.isPaid || false,
        paymentMethod: data.paymentMethod || PAYMENT_METHOD.CASH,
        isPickup: data.isPickup || false,
        type: data.type || 'dine_in',
        materialHolds: heldMaterials,
      });

      // 6. Tạo các OrderItem liên kết tới order._id (kèm snapshot định mức nguyên liệu)
      const recipeMaterialsMap = await MaterialService.getRecipeMaterialsMap(
        orderItemsToCreate.map((i) => i.productId)
      );
      for (const itemData of orderItemsToCreate) {
        itemData.orderId = order._id;
        const recipeMaterials = recipeMaterialsMap.get(String(itemData.productId));
        if (recipeMaterials) {
          itemData.materials = recipeMaterials.map((m) => ({
            materialId: m.materialId,
            name: m.name,
            unit: m.unit,
            quantityPerUnit: m.quantityPerUnit,
            totalQuantity: m.quantityPerUnit * itemData.qty,
          }));
        }
        await OrderItem.create(itemData);

        // Trừ tồn kho: chỉ với sản phẩm KHÔNG công thức (SP có công thức đã tạm giữ nguyên liệu)
        if (!recipeProductIds.has(String(itemData.productId))) {
          await Product.findByIdAndUpdate(itemData.productId, { $inc: { stock: -itemData.qty } });
        }
      }
    } catch (error) {
      // Bù trừ: nhả nguyên liệu đã tạm giữ + hoàn lại voucher đã claim nếu tạo đơn thất bại
      await MaterialService.releaseHolds(heldMaterials);
      if (claimedWalletVoucherId) {
        await CustomerVoucher.updateOne(
          { _id: claimedWalletVoucherId },
          { isUsed: false, $unset: { usedAt: 1, orderId: 1 } }
        );
      } else if (voucherCode && resolvedVoucherId) {
        await Voucher.updateOne(
          { _id: resolvedVoucherId, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      }
      throw error;
    }

    // Gắn đơn hàng vào voucher ví đã sử dụng
    if (claimedWalletVoucherId) {
      await CustomerVoucher.updateOne({ _id: claimedWalletVoucherId }, { orderId: order._id });
    }

    // 7. Cập nhật trạng thái bàn sang OCCUPIED (Đang có khách) nếu là đơn tại bàn
    if (tableId) {
      const updatedTable = await Table.findByIdAndUpdate(
        tableId,
        { status: TABLE_STATUS.OCCUPIED },
        { new: true }
      );
      if (updatedTable) {
        emitToAll('table_updated', updatedTable);
      }
    }

    // Populate dữ liệu để trả về đầy đủ thông tin
    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate(ORDER_ITEMS_POPULATE);

    // 8. Gửi sự kiện Socket.io real-time thông báo đơn hàng mới
    emitToAll('order_created', populatedOrder);

    return populatedOrder;
  }

  /**
   * Cập nhật trạng thái đơn hàng
   */
  static async updateOrderStatus(orderId, newStatus, updatedById) {
    if (!newStatus || typeof newStatus !== 'string') {
      throw new AppError('Trạng thái đơn hàng không hợp lệ', 400);
    }

    let order = await Order.findById(orderId);
    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    const currentStatus = order.status;

    if (currentStatus === ORDER_STATUS.COMPLETED) {
      throw new AppError('Đơn hàng đã hoàn thành, không thể thay đổi trạng thái', 400);
    }
    if (currentStatus === ORDER_STATUS.CANCELLED) {
      throw new AppError('Đơn hàng đã bị hủy, không thể thay đổi trạng thái', 400);
    }
    if (currentStatus === ORDER_STATUS.REFUNDED) {
      throw new AppError('Đơn hàng đã hoàn trả, không thể thay đổi trạng thái', 400);
    }

    // Đảm bảo trạng thái mới hợp lệ (REFUNDED phải đi qua endpoint hoàn trả riêng)
    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(newStatus) || newStatus === ORDER_STATUS.REFUNDED) {
      throw new AppError('Trạng thái đơn hàng không hợp lệ', 400);
    }

    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: currentStatus },
      { $set: { status: newStatus, updatedBy: updatedById } },
      { new: true }
    );
    if (!claimed) {
      throw new AppError('Đơn hàng vừa được cập nhật trạng thái ở một thao tác khác, vui lòng tải lại', 409);
    }
    order = claimed;

    // Tích điểm tự động khi đơn hoàn thành: 1 điểm / POINTS_RATE VND
    if (newStatus === ORDER_STATUS.COMPLETED) {
      order.isPaid = true;

      // Trừ kho chính thức (COMMIT) số nguyên liệu đã tạm giữ
      if (order.materialHolds && order.materialHolds.length > 0) {
        await MaterialService.commitHolds(order.materialHolds, order._id, updatedById);
      }

      if (order.customerId) {
        const points = Math.floor(order.total / POINTS_RATE);
        if (points > 0 && order.pointsAwarded === 0) {
          const pointRes = await CustomerService.adjustPoints(
            order.customerId,
            points,
            `Đơn hàng ${order.code}`,
            `Tích điểm từ hóa đơn ${order.total.toLocaleString('vi-VN')}đ`,
            POINT_TRANSACTION_TYPE.ORDER,
            { spentChange: order.total, orderId: order._id, affectsCycle: true }
          );
          if (pointRes.success) {
            order.pointsAwarded = points;
          }
        }
        // Cập nhật realtime số liệu KH: ghi nhận thêm 1 đơn hoàn tất (cho tiêu chí lọc nhóm).
        // Hook trong customer.model tự đồng bộ các nhóm AUTO bật cập nhật realtime.
        await Customer.updateOne(
          { _id: order.customerId },
          { $set: { lastVisitAt: new Date() }, $inc: { orderCount: 1 } }
        );

        // Cấp lượt Trò chơi may mắn theo hoạt động (không chặn luồng đơn nếu lỗi)
        try {
          await GameService.grantTurnsForActivity(
            order.customerId,
            GAME_ACTIVITY_TYPE.ORDER_COMPLETED,
            { note: `Hoàn tất đơn ${order.code}` }
          );
        } catch (err) {
          console.error('[Order] Lỗi cấp lượt trò chơi khi hoàn tất đơn:', err.message);
        }
      }
    }

    await order.save();

    // Nếu đơn hàng chuyển sang COMPLETED hoặc CANCELLED, kiểm tra xem còn đơn hàng nào đang hoạt động tại bàn này không
    if ((newStatus === ORDER_STATUS.COMPLETED || newStatus === ORDER_STATUS.CANCELLED) && order.tableId) {
      const activeOrdersAtTable = await Order.findOne({
        tableId: order.tableId,
        status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY] },
        _id: { $ne: order._id }
      });
      if (!activeOrdersAtTable) {
        const updatedTable = await Table.findByIdAndUpdate(
          order.tableId,
          { status: TABLE_STATUS.AVAILABLE },
          { new: true }
        );
        if (updatedTable) {
          emitToAll('table_updated', updatedTable);
        }
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate(ORDER_ITEMS_POPULATE);

    // Gửi sự kiện Socket.io real-time
    emitToAll('order_status_updated', populatedOrder);

    return populatedOrder;
  }

  /**
   * Hủy đơn hàng kèm lý do
   */
  static async cancelOrder(orderId, reason, updatedById) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new AppError('Lý do hủy đơn hàng là bắt buộc', 400);
    }

    const order = await Order.findById(orderId);
    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status === ORDER_STATUS.COMPLETED) {
      throw new AppError('Không thể hủy đơn hàng đã hoàn thành', 400);
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new AppError('Đơn hàng đã được hủy trước đó', 400);
    }

    order.status = ORDER_STATUS.CANCELLED;
    order.note = order.note ? `${order.note} | Lý do hủy: ${reason}` : `Lý do hủy: ${reason}`;
    order.updatedBy = updatedById;
    await order.save();

    // Hoàn lại voucher đã dùng cho đơn
    if (order.customerVoucherId) {
      await CustomerVoucher.updateOne(
        { _id: order.customerVoucherId },
        { isUsed: false, $unset: { usedAt: 1, orderId: 1 } }
      );
    } else if (order.voucherId) {
      await Voucher.findOneAndUpdate(
        { _id: order.voucherId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    }

    // HOÀN TÁC (ROLLBACK) nguyên liệu đang tạm giữ (đơn chưa trừ kho vì chưa COMPLETED)
    if (order.materialHolds && order.materialHolds.length > 0) {
      await MaterialService.releaseHolds(order.materialHolds);
    }

    // Hoàn lại tồn kho product.stock: chỉ với sản phẩm KHÔNG công thức
    const orderItems = await OrderItem.find({ orderId: order._id });
    const recipeSet = await MaterialService.getRecipeProductIdSet(orderItems.map((i) => i.productId));
    for (const item of orderItems) {
      if (!recipeSet.has(String(item.productId))) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
      }
    }

    // Giải phóng bàn nếu không còn đơn hàng nào hoạt động
    if (order.tableId) {
      const activeOrdersAtTable = await Order.findOne({
        tableId: order.tableId,
        status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY] },
        _id: { $ne: order._id }
      });
      if (!activeOrdersAtTable) {
        const updatedTable = await Table.findByIdAndUpdate(
          order.tableId,
          { status: TABLE_STATUS.AVAILABLE },
          { new: true }
        );
        if (updatedTable) {
          emitToAll('table_updated', updatedTable);
        }
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate(ORDER_ITEMS_POPULATE);

    // Gửi sự kiện Socket.io real-time
    emitToAll('order_status_updated', populatedOrder);

    return populatedOrder;
  }

  /**
   * Hoàn trả đơn hàng đã hoàn thành (trừ lại điểm tích lũy đã cộng)
   */
  static async refundOrder(orderId, reason, updatedById) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new AppError('Lý do hoàn trả đơn hàng là bắt buộc', 400);
    }

    let order = await Order.findById(orderId);
    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status === ORDER_STATUS.REFUNDED) {
      throw new AppError('Đơn hàng đã được hoàn trả trước đó', 400);
    }
    if (order.status !== ORDER_STATUS.COMPLETED) {
      throw new AppError('Chỉ có thể hoàn trả đơn hàng đã hoàn thành', 400);
    }

    const updatedNote = order.note ? `${order.note} | Lý do hoàn trả: ${reason}` : `Lý do hoàn trả: ${reason}`;
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: ORDER_STATUS.COMPLETED },
      { $set: { status: ORDER_STATUS.REFUNDED, note: updatedNote, updatedBy: updatedById } },
      { new: true }
    );
    if (!claimed) {
      throw new AppError('Đơn hàng vừa được cập nhật ở một thao tác khác, vui lòng tải lại', 409);
    }
    order = claimed;

    // Trừ lại điểm đã cộng khi đơn hoàn thành (clamp theo số dư nếu khách đã tiêu bớt điểm)
    if (order.pointsAwarded > 0 && order.customerId) {
      const customer = await Customer.findById(order.customerId);
      if (customer) {
        const deduction = Math.min(order.pointsAwarded, customer.currentPoints);
        if (deduction > 0) {
          await CustomerService.adjustPoints(
            order.customerId,
            -deduction,
            `Hoàn trả đơn hàng ${order.code}`,
            deduction < order.pointsAwarded
              ? `Trừ ${deduction}/${order.pointsAwarded} điểm (số dư không đủ để trừ toàn bộ)`
              : `Trừ lại ${deduction} điểm đã tích từ đơn hàng`,
            POINT_TRANSACTION_TYPE.REFUND,
            { spentChange: -order.total, orderId: order._id, affectsCycle: true }
          );
        }
      }
      order.pointsAwarded = 0;
    }

    // Cập nhật realtime số liệu KH: trừ lại 1 đơn hoàn tất do hoàn trả
    if (order.customerId) {
      await Customer.updateOne(
        { _id: order.customerId, orderCount: { $gt: 0 } },
        { $inc: { orderCount: -1 } }
      );
    }

    // Hoàn lại voucher đã dùng cho đơn
    if (order.customerVoucherId) {
      await CustomerVoucher.updateOne(
        { _id: order.customerVoucherId },
        { isUsed: false, $unset: { usedAt: 1, orderId: 1 } }
      );
    } else if (order.voucherId) {
      await Voucher.findOneAndUpdate(
        { _id: order.voucherId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      );
    }

    // HOÀN KHO (RESTOCK) nguyên liệu đã trừ khi đơn hoàn tất
    if (order.materialHolds && order.materialHolds.length > 0) {
      await MaterialService.restockHolds(order.materialHolds, order._id, updatedById);
    }

    // Hoàn lại tồn kho product.stock: chỉ với sản phẩm KHÔNG công thức
    const refundOrderItems = await OrderItem.find({ orderId: order._id });
    const refundRecipeSet = await MaterialService.getRecipeProductIdSet(refundOrderItems.map((i) => i.productId));
    for (const item of refundOrderItems) {
      if (!refundRecipeSet.has(String(item.productId))) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
      }
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate(ORDER_ITEMS_POPULATE);

    // Gửi sự kiện Socket.io real-time
    emitToAll('order_status_updated', populatedOrder);

    return populatedOrder;
  }

  /**
   * Lấy chi tiết đơn hàng theo ID
   */
  static async getOrderById(orderId) {
    const order = await Order.findById(orderId)
      .populate('tableId')
      .populate('customerId', 'fullName phone email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate(ORDER_ITEMS_POPULATE)
      .populate('voucherId')
      .lean();

    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    return order;
  }

  /**
   * Lấy danh sách tất cả đơn hàng kèm phân trang & lọc giao dịch tiền
   */
  static async getAllOrders(query = {}) {
    const {
      status,
      tableId,
      customerId,
      paymentMethod,
      isPaid,
      search,
      page = 1,
      limit = 10,
      startDate,
      endDate,
    } = query;
    const filter = { isActive: IS_ACTIVE.TRUE };

    if (status !== undefined && status !== '' && status !== 'ALL') {
      filter.status = status;
    }
    if (tableId) {
      filter.tableId = tableId;
    }
    if (customerId) {
      filter.customerId = customerId;
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      filter.paymentMethod = paymentMethod;
    }
    if (isPaid !== undefined && isPaid !== '' && isPaid !== 'ALL') {
      filter.isPaid = isPaid === 'true' || isPaid === true;
    }

    // Lọc theo khoảng thời gian tạo đơn
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      const matchedCustomers = await Customer.find({
        $or: [
          { fullName: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } },
        ],
      }).select('_id');

      const customerIds = matchedCustomers.map((c) => c._id);

      filter.$or = [
        { code: { $regex: keyword, $options: 'i' } },
        { orderNumber: { $regex: keyword, $options: 'i' } },
        { customerId: { $in: customerIds } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate('tableId', 'name')
      .populate('customerId', 'fullName phone email avatar')
      .populate('createdBy', 'name email')
      .populate(ORDER_ITEMS_POPULATE)
      .populate('voucherId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Order.countDocuments(filter);

    return {
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Tổng quan thống kê tài chính & giao dịch thanh toán
   */
  static async getPaymentSummary(query = {}) {
    const { startDate, endDate } = query;
    const filter = { isActive: IS_ACTIVE.TRUE };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const paidMatchFilter = {
      ...filter,
      status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] },
      $or: [{ status: ORDER_STATUS.COMPLETED }, { isPaid: true }],
    };

    const [summaryResult, totalOrdersCount, paidOrdersCount] = await Promise.all([
      Order.aggregate([
        { $match: paidMatchFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            cashRevenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', PAYMENT_METHOD.CASH] }, '$total', 0],
              },
            },
            transferRevenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', PAYMENT_METHOD.TRANSFER] }, '$total', 0],
              },
            },
          },
        },
      ]),
      Order.countDocuments(filter),
      Order.countDocuments(paidMatchFilter),
    ]);

    const stats = summaryResult[0] || { totalRevenue: 0, cashRevenue: 0, transferRevenue: 0 };

    return {
      totalRevenue: stats.totalRevenue || 0,
      cashRevenue: stats.cashRevenue || 0,
      transferRevenue: stats.transferRevenue || 0,
      totalOrdersCount,
      paidOrdersCount,
    };
  }

  /**
   * Xác nhận đơn hàng
   */
  static async confirmOrder(orderId, updatedById) {
    return this.updateOrderStatus(orderId, ORDER_STATUS.CONFIRMED, updatedById);
  }

  /**
   * Hoàn tất đơn hàng
   */
  static async completeOrder(orderId, updatedById) {
    return this.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED, updatedById);
  }
}

module.exports = OrderService;
