const Order = require('../models/order.model');
const { OrderItem } = require('../models/orderItem.model');
const Product = require('../models/product.model');
const ProductVariant = require('../models/productVariant.model');
const Table = require('../models/table.model');
const Voucher = require('../models/voucher.model');
const Customer = require('../models/customer.model');
const VoucherService = require('./voucher.service');
const { ORDER_STATUS, TABLE_STATUS, IS_ACTIVE } = require('../enums');
const { emitToAll } = require('./socket.service');
const mongoose = require('mongoose');

class OrderService {
  /**
   * Tạo đơn hàng mới
   */
  static async createOrder(data, createdById) {
    const { tableId, customerId, items, voucherCode, note } = data;

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

      const voucherRes = await VoucherService.validateVoucher(voucherCode, subtotalSum);
      if (!voucherRes.success) {
        return voucherRes;
      }
      discountAmount = voucherRes.data.discountAmount;
      finalAmount = voucherRes.data.finalAmount;

      // Cập nhật lượt sử dụng của voucher
      await Voucher.findOneAndUpdate(
        { code: voucherCode.toUpperCase() },
        { $inc: { usedCount: 1 } }
      );
    }

    // 4. Sinh mã đơn hàng ngẫu nhiên duy nhất
    const code = `OD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase();

    // 5. Tạo đơn hàng mới
    const order = await Order.create({
      code,
      orderNumber: code,
      tableId: tableId || null,
      customerId: resolvedCustomerId || null,
      voucherId: resolvedVoucherId,
      subtotal: subtotalSum,
      discount: discountAmount,
      total: finalAmount,
      status: ORDER_STATUS.PENDING,
      note: note || '',
      createdBy: createdById || null,
      isUrgent: data.isUrgent || false,
      isPaid: data.isPaid || false,
      isPickup: data.isPickup || false,
      type: data.type || 'dine_in',
    });

    // 6. Tạo các OrderItem liên kết tới order._id
    for (const itemData of orderItemsToCreate) {
      itemData.orderId = order._id;
      await OrderItem.create(itemData);
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

    // Đảm bảo trạng thái mới hợp lệ
    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(newStatus)) {
      return { status: 400, success: false, message: 'Trạng thái đơn hàng không hợp lệ' };
    }

    order.status = newStatus;
    order.updatedBy = updatedById;
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
   * Lấy chi tiết đơn hàng theo ID
   */
  static async getOrderById(orderId) {
    const order = await Order.findById(orderId)
      .populate('tableId')
      .populate('customerId', 'fullName phone email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('items')
      .populate('voucherId');

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
      .limit(parseInt(limit));

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
