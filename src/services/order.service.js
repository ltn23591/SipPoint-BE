const Order = require('../models/order.model');
const { OrderItem } = require('../models/orderItem.model');
const Product = require('../models/product.model');
const ProductVariant = require('../models/productVariant.model');
const Topping = require('../models/topping.model');
const Table = require('../models/table.model');
const Voucher = require('../models/voucher.model');
const CustomerVoucher = require('../models/customerVoucher.model');
const Customer = require('../models/customer.model');
const VoucherService = require('./voucher.service');
const CustomerService = require('./customer.service');
const { ORDER_STATUS, TABLE_STATUS, IS_ACTIVE, POINT_TRANSACTION_TYPE, POINTS_RATE, PAYMENT_METHOD } = require('../enums');
const { emitToAll } = require('./socket.service');
const mongoose = require('mongoose');

class OrderService {
  /**
   * Tạo đơn hàng mới
   */
  static async createOrder(data, createdById) {
    const { tableId, customerId, items, voucherCode, customerVoucherId, note } = data;

    if (voucherCode && customerVoucherId) {
      return { status: 400, success: false, message: 'Chỉ được áp dụng một loại voucher cho mỗi đơn hàng' };
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
          return { status: 404, success: false, message: `Không tìm thấy khách hàng với mã số ${customerId}` };
        }
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { status: 400, success: false, message: 'Đơn hàng phải chứa ít nhất một món ăn/đồ uống' };
    }

    for (const item of items) {
      if (!item.productId) {
        return { status: 400, success: false, message: 'Mã sản phẩm (productId) là bắt buộc' };
      }
      if (item.qty === undefined || item.qty === null || isNaN(item.qty) || parseInt(item.qty) < 1) {
        return { status: 400, success: false, message: 'Số lượng món ăn/đồ uống phải lớn hơn hoặc bằng 1' };
      }
    }

    // 1. Kiểm tra bàn (nếu có)
    if (tableId) {
      const table = await Table.findById(tableId);
      if (!table) {
        return { status: 404, success: false, message: 'Không tìm thấy bàn yêu cầu' };
      }
      if (table.status === TABLE_STATUS.RESERVED) {
        return { status: 400, success: false, message: 'Bàn này đã được đặt trước' };
      }
    }

    // 2. Xử lý danh sách items
    const orderItemsToCreate = [];
    let subtotalSum = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || product.isDeleted || product.isActive === 0) {
        return { status: 404, success: false, message: `Sản phẩm với ID ${item.productId} không tồn tại hoặc đã ngừng kinh doanh` };
      }

      // Lấy biến thể (variants) nếu có
      const itemVariants = [];
      let variantPriceSum = 0;

      if (item.variants && Array.isArray(item.variants)) {
        for (const v of item.variants) {
          const variant = await ProductVariant.findById(v.variantId);
          if (!variant || variant.isActive === 0) {
            return { status: 404, success: false, message: `Biến thể với ID ${v.variantId} không tồn tại hoặc đã ngừng hoạt động` };
          }
          itemVariants.push({
            variantId: variant._id,
            name: variant.name,
            priceAdjustment: variant.priceAdjustment,
          });
          variantPriceSum += variant.priceAdjustment;
        }
      }

      const itemToppings = [];
      let toppingPriceSum = 0;
      if (item.toppings && Array.isArray(item.toppings)) {
        for (const t of item.toppings) {
          const topping = await Topping.findById(t.toppingId || t._id);
          if (!topping || topping.isActive === 'inactive') {
            return { status: 404, success: false, message: `Topping với ID ${t.toppingId || t._id} không tồn tại hoặc đã ngừng hoạt động` };
          }
          itemToppings.push({
            toppingId: topping._id,
            name: topping.name,
            price: topping.price,
          });
          toppingPriceSum += topping.price;
        }
      }

      const itemPrice = product.price;
      const quantity = parseInt(item.qty) || 1;
      const itemSubtotal = (itemPrice + variantPriceSum + toppingPriceSum) * quantity;

      orderItemsToCreate.push({
        productId: product._id,
        name: product.name,
        unitPrice: itemPrice,
        qty: quantity,
        variants: itemVariants,
        toppings: itemToppings,
        note: item.note || '',
        subtotal: itemSubtotal,
      });

      subtotalSum += itemSubtotal;
    }

    // 3. Xử lý Voucher (nếu có)
    let discountAmount = 0;
    let finalAmount = subtotalSum;
    let resolvedVoucherId = null;

    if (voucherCode) {
      const voucherObj = await Voucher.findOne({ code: voucherCode.toUpperCase() });
      if (!voucherObj) {
        return { status: 404, success: false, message: 'Voucher không tồn tại' };
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
          return { status: 400, success: false, message: 'Bạn đã đạt giới hạn sử dụng mã giảm giá này' };
        }
      }

      const voucherRes = await VoucherService.validateVoucher(voucherCode, subtotalSum);
      if (!voucherRes.success) {
        return voucherRes;
      }
      discountAmount = voucherRes.data.discountAmount;
      finalAmount = voucherRes.data.finalAmount;

      // Cập nhật lượt sử dụng atomic - thất bại nghĩa là voucher vừa hết lượt (race)
      const claimed = await Voucher.findOneAndUpdate(
        {
          code: voucherCode.toUpperCase(),
          isActive: 'active',
          $expr: { $lt: ['$usedCount', '$usageLimit'] },
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      );
      if (!claimed) {
        return { status: 400, success: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
      }
    }

    // 3b. Xử lý voucher trong ví khách hàng (phát từ campaign hoặc đổi điểm)
    let claimedWalletVoucherId = null;
    if (customerVoucherId) {
      if (!resolvedCustomerId) {
        return { status: 400, success: false, message: 'Đơn hàng phải gắn với khách hàng để dùng voucher trong ví' };
      }

      const walletRes = await VoucherService.validateWalletVoucher(customerVoucherId, resolvedCustomerId, subtotalSum);
      if (!walletRes.success) {
        return walletRes;
      }
      discountAmount = walletRes.data.discountAmount;
      finalAmount = walletRes.data.finalAmount;
      resolvedVoucherId = walletRes.data.voucherId;

      // Claim atomic - chống dùng cùng lúc trên 2 đơn (kho voucher đã trừ lúc phát, KHÔNG tăng usedCount)
      const claimedWallet = await CustomerVoucher.findOneAndUpdate(
        { _id: customerVoucherId, customerId: resolvedCustomerId, isUsed: false },
        { isUsed: true, usedAt: new Date() },
        { new: true }
      );
      if (!claimedWallet) {
        return { status: 400, success: false, message: 'Voucher đã được sử dụng, vui lòng thử lại' };
      }
      claimedWalletVoucherId = claimedWallet._id;
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
      });

      // 6. Tạo các OrderItem liên kết tới order._id
      for (const itemData of orderItemsToCreate) {
        itemData.orderId = order._id;
        await OrderItem.create(itemData);
        
        // Trừ tồn kho
        await Product.findByIdAndUpdate(itemData.productId, { $inc: { stock: -itemData.qty } });
      }
    } catch (error) {
      // Bù trừ: hoàn lại voucher đã claim nếu tạo đơn thất bại
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
      await Table.findByIdAndUpdate(tableId, { status: TABLE_STATUS.OCCUPIED });
    }

    // Populate dữ liệu để trả về đầy đủ thông tin
    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('items');

    // 8. Gửi sự kiện Socket.io real-time thông báo đơn hàng mới
    emitToAll('order_created', populatedOrder);

    return {
      status: 201,
      success: true,
      message: 'Đặt đơn hàng thành công',
      data: populatedOrder,
    };
  }

  /**
   * Cập nhật trạng thái đơn hàng
   */
  static async updateOrderStatus(orderId, newStatus, updatedById) {
    if (!newStatus || typeof newStatus !== 'string') {
      return { status: 400, success: false, message: 'Trạng thái đơn hàng không hợp lệ' };
    }

    const order = await Order.findById(orderId);
    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      return { status: 404, success: false, message: 'Không tìm thấy đơn hàng' };
    }

    const currentStatus = order.status;

    if (currentStatus === ORDER_STATUS.COMPLETED) {
      return { status: 400, success: false, message: 'Đơn hàng đã hoàn thành, không thể thay đổi trạng thái' };
    }
    if (currentStatus === ORDER_STATUS.CANCELLED) {
      return { status: 400, success: false, message: 'Đơn hàng đã bị hủy, không thể thay đổi trạng thái' };
    }
    if (currentStatus === ORDER_STATUS.REFUNDED) {
      return { status: 400, success: false, message: 'Đơn hàng đã hoàn trả, không thể thay đổi trạng thái' };
    }

    // Đảm bảo trạng thái mới hợp lệ (REFUNDED phải đi qua endpoint hoàn trả riêng)
    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(newStatus) || newStatus === ORDER_STATUS.REFUNDED) {
      return { status: 400, success: false, message: 'Trạng thái đơn hàng không hợp lệ' };
    }

    order.status = newStatus;
    order.updatedBy = updatedById;

    // Tích điểm tự động khi đơn hoàn thành: 1 điểm / POINTS_RATE VND
    if (newStatus === ORDER_STATUS.COMPLETED) {
      order.isPaid = true;
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
        await Customer.updateOne({ _id: order.customerId }, { lastVisitAt: new Date() });
      }
    }

    await order.save();

    // Nếu đơn hàng chuyển sang COMPLETED hoặc CANCELLED, kiểm tra xem còn đơn hàng nào đang hoạt động tại bàn này không
    if ((newStatus === ORDER_STATUS.COMPLETED || newStatus === ORDER_STATUS.CANCELLED) && order.tableId) {
      const activeOrdersAtTable = await Order.findOne({
        tableId: order.tableId,
        status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING] },
        _id: { $ne: order._id }
      });
      if (!activeOrdersAtTable) {
        await Table.findByIdAndUpdate(order.tableId, { status: TABLE_STATUS.AVAILABLE });
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('items');

    // Gửi sự kiện Socket.io real-time
    emitToAll('order_status_updated', populatedOrder);

    return {
      status: 200,
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: populatedOrder,
    };
  }

  /**
   * Hủy đơn hàng kèm lý do
   */
  static async cancelOrder(orderId, reason, updatedById) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return { status: 400, success: false, message: 'Lý do hủy đơn hàng là bắt buộc' };
    }

    const order = await Order.findById(orderId);
    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      return { status: 404, success: false, message: 'Không tìm thấy đơn hàng' };
    }

    if (order.status === ORDER_STATUS.COMPLETED) {
      return { status: 400, success: false, message: 'Không thể hủy đơn hàng đã hoàn thành' };
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
      return { status: 400, success: false, message: 'Đơn hàng đã được hủy trước đó' };
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

    // Hoàn lại số lượng tồn kho
    const orderItems = await OrderItem.find({ orderId: order._id });
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
    }

    // Giải phóng bàn nếu không còn đơn hàng nào hoạt động
    if (order.tableId) {
      const activeOrdersAtTable = await Order.findOne({
        tableId: order.tableId,
        status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING] },
        _id: { $ne: order._id }
      });
      if (!activeOrdersAtTable) {
        await Table.findByIdAndUpdate(order.tableId, { status: TABLE_STATUS.AVAILABLE });
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('items');

    // Gửi sự kiện Socket.io real-time
    emitToAll('order_status_updated', populatedOrder);

    return {
      status: 200,
      success: true,
      message: 'Hủy đơn hàng thành công',
      data: populatedOrder,
    };
  }

  /**
   * Hoàn trả đơn hàng đã hoàn thành (trừ lại điểm tích lũy đã cộng)
   */
  static async refundOrder(orderId, reason, updatedById) {
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return { status: 400, success: false, message: 'Lý do hoàn trả đơn hàng là bắt buộc' };
    }

    const order = await Order.findById(orderId);
    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      return { status: 404, success: false, message: 'Không tìm thấy đơn hàng' };
    }

    if (order.status !== ORDER_STATUS.COMPLETED) {
      return { status: 400, success: false, message: 'Chỉ có thể hoàn trả đơn hàng đã hoàn thành' };
    }

    order.status = ORDER_STATUS.REFUNDED;
    order.note = order.note ? `${order.note} | Lý do hoàn trả: ${reason}` : `Lý do hoàn trả: ${reason}`;
    order.updatedBy = updatedById;

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

    // Hoàn lại số lượng tồn kho
    const refundOrderItems = await OrderItem.find({ orderId: order._id });
    for (const item of refundOrderItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty } });
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('tableId', 'name zoneId')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('items');

    // Gửi sự kiện Socket.io real-time
    emitToAll('order_status_updated', populatedOrder);

    return {
      status: 200,
      success: true,
      message: 'Hoàn trả đơn hàng thành công',
      data: populatedOrder,
    };
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
      .populate('items')
      .populate('voucherId')
      .lean();

    if (!order || order.isActive === IS_ACTIVE.FALSE) {
      return { status: 404, success: false, message: 'Không tìm thấy đơn hàng' };
    }

    return { status: 200, success: true, data: order };
  }

  /**
   * Lấy danh sách tất cả đơn hàng kèm phân trang & lọc
   */
  static async getAllOrders(query) {
    const { status, tableId, customerId, page = 1, limit = 10, startDate, endDate } = query;
    const filter = { isActive: IS_ACTIVE.TRUE };

    if (status !== undefined && status !== '') {
      filter.status = status;
    }
    if (tableId) {
      filter.tableId = tableId;
    }
    if (customerId) {
      filter.customerId = customerId;
    }

    // Lọc theo khoảng thời gian tạo đơn
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate('tableId', 'name')
      .populate('customerId', 'fullName phone')
      .populate('createdBy', 'name email')
      .populate('items')
      .populate('voucherId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Order.countDocuments(filter);

    return {
      status: 200,
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
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
