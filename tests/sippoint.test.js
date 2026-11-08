process.env.NODE_ENV = 'test';
process.env.SEPAY_WEBHOOK_API_KEY = 'test_webhook_secret_key';
process.env.SEPAY_SECRET_KEY = 'test_pg_secret_key';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const Order = require('../src/models/order.model');
const Customer = require('../src/models/customer.model');
const { OrderItem } = require('../src/models/orderItem.model');
const Feedback = require('../src/models/feedback.model');
const OrderService = require('../src/services/order.service');
const FeedbackService = require('../src/services/feedback.service');
const CustomerService = require('../src/services/customer.service');
const MaterialService = require('../src/services/material.service');
const sepayService = require('../src/services/sepay.service');
const { ORDER_STATUS, PAYMENT_METHOD, IS_ACTIVE } = require('../src/enums');

describe('SipPoint Core Business Flows', () => {
  describe('1. SePay Webhook & Header Verification (sepay.service)', () => {
    it('verifies valid Bank Webhook API key via Authorization: Apikey header', () => {
      const req = {
        headers: {
          authorization: 'Apikey test_webhook_secret_key',
        },
      };
      assert.equal(sepayService.verifyBankWebhookApiKey(req).valid, true);
    });

    it('rejects invalid Bank Webhook API key', () => {
      const req = {
        headers: {
          authorization: 'Apikey wrong_key',
        },
      };
      assert.equal(sepayService.verifyBankWebhookApiKey(req).valid, false);
    });

    it('verifies SePay PG x-secret-key header using timing-safe comparison', () => {
      const validReq = { headers: { 'x-secret-key': 'test_pg_secret_key' } };
      const invalidReq = { headers: { 'x-secret-key': 'invalid_pg_secret' } };
      assert.equal(sepayService.verifyPgSecretHeader(validReq), true);
      assert.equal(sepayService.verifyPgSecretHeader(invalidReq), false);
    });
  });

  describe('2. Order Refund Guard & State Transitions (OrderService.refundOrder)', () => {
    beforeEach(() => {
      Order.findById = undefined;
      Order.findOneAndUpdate = undefined;
    });

    it('rejects refunding an order that is not COMPLETED (e.g. CANCELLED or PENDING)', async () => {
      Order.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        code: 'ORD-001',
        status: ORDER_STATUS.CANCELLED,
        isActive: IS_ACTIVE.TRUE,
      });

      await assert.rejects(
        () => OrderService.refundOrder('507f1f77bcf86cd799439011', 'Khách đổi ý', null),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Chỉ có thể hoàn trả đơn hàng đã hoàn thành/);
          return true;
        }
      );
    });

    it('rejects duplicate refund when order is already REFUNDED', async () => {
      Order.findById = async () => ({
        _id: '507f1f77bcf86cd799439011',
        code: 'ORD-001',
        status: ORDER_STATUS.REFUNDED,
        isActive: IS_ACTIVE.TRUE,
      });

      await assert.rejects(
        () => OrderService.refundOrder('507f1f77bcf86cd799439011', 'Hoàn lần 2', null),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Đơn hàng đã được hoàn trả trước đó/);
          return true;
        }
      );
    });

    it('atomically transitions COMPLETED order to REFUNDED and deducts awarded loyalty points', async () => {
      let adjustedPoints = 0;
      const mockOrderDoc = {
        _id: '507f1f77bcf86cd799439011',
        code: 'ORD-002',
        status: ORDER_STATUS.COMPLETED,
        isActive: IS_ACTIVE.TRUE,
        total: 100000,
        pointsAwarded: 10,
        customerId: '507f1f77bcf86cd799439022',
        materialHolds: [],
        save: async function () {
          return this;
        },
      };

      Order.findById = (id) => {
        if (Order.findById._populateMode) {
          const chain = {
            populate: () => chain,
            then: (resolve) => resolve({ ...mockOrderDoc, _id: id, status: ORDER_STATUS.REFUNDED }),
          };
          return chain;
        }
        return Promise.resolve(mockOrderDoc);
      };

      Order.findOneAndUpdate = async () => {
        Order.findById._populateMode = true;
        mockOrderDoc.status = ORDER_STATUS.REFUNDED;
        return mockOrderDoc;
      };

      Customer.findById = async () => ({
        _id: '507f1f77bcf86cd799439022',
        currentPoints: 25,
      });
      Customer.updateOne = async () => ({ modifiedCount: 1 });
      CustomerService.adjustPoints = async (_custId, delta) => {
        adjustedPoints = delta;
        return { success: true };
      };
      OrderItem.find = async () => [];
      MaterialService.getRecipeProductIdSet = async () => new Set();

      const result = await OrderService.refundOrder(
        '507f1f77bcf86cd799439011',
        'Pha nhầm món',
        null
      );

      assert.equal(result.status, ORDER_STATUS.REFUNDED);
      assert.equal(adjustedPoints, -10);
      assert.equal(mockOrderDoc.pointsAwarded, 0);
      Order.findById._populateMode = false;
    });
  });

  describe('3. Customer Self-Cancellation & Expired Transfer Order Auto-Cancel', () => {
    it('allows customer to cancel an unpaid PENDING order', async () => {
      Order.findById = async () => ({
        _id: '507f1f77bcf86cd799439033',
        code: 'ORD-003',
        status: ORDER_STATUS.PENDING,
        isPaid: false,
        isActive: IS_ACTIVE.TRUE,
        customerId: '507f1f77bcf86cd799439022',
      });

      let cancelledWithReason = '';
      const origCancel = OrderService.cancelOrder;
      OrderService.cancelOrder = async (_id, reason) => {
        cancelledWithReason = reason;
        return { _id, status: ORDER_STATUS.CANCELLED, note: reason };
      };

      try {
        const res = await OrderService.cancelCustomerOrder(
          '507f1f77bcf86cd799439033',
          'Đặt nhầm bàn',
          '507f1f77bcf86cd799439022'
        );
        assert.equal(res.status, ORDER_STATUS.CANCELLED);
        assert.match(cancelledWithReason, /Khách tự hủy: Đặt nhầm bàn/);
      } finally {
        OrderService.cancelOrder = origCancel;
      }
    });

    it('prevents customer from cancelling an order that is already PREPARING', async () => {
      Order.findById = async () => ({
        _id: '507f1f77bcf86cd799439033',
        code: 'ORD-003',
        status: ORDER_STATUS.PREPARING,
        isPaid: false,
        isActive: IS_ACTIVE.TRUE,
      });

      await assert.rejects(
        () => OrderService.cancelCustomerOrder('507f1f77bcf86cd799439033', 'Đổi ý'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Chỉ có thể hủy đơn hàng khi quán chưa xác nhận/);
          return true;
        }
      );
    });

    it('auto-cancels expired unpaid TRANSFER orders older than timeoutMinutes', async () => {
      Order.find = () => ({
        select: async () => [
          { _id: '507f1f77bcf86cd799439044', code: 'ORD-EXP-1' },
          { _id: '507f1f77bcf86cd799439045', code: 'ORD-EXP-2' },
        ],
      });

      const cancelledIds = [];
      const origCancel = OrderService.cancelOrder;
      OrderService.cancelOrder = async (id) => {
        cancelledIds.push(id);
        return { _id: id, status: ORDER_STATUS.CANCELLED };
      };

      try {
        const result = await OrderService.cancelExpiredUnpaidOrders(15);
        assert.equal(result.cancelledCount, 2);
        assert.deepEqual(cancelledIds, [
          '507f1f77bcf86cd799439044',
          '507f1f77bcf86cd799439045',
        ]);
      } finally {
        OrderService.cancelOrder = origCancel;
      }
    });
  });

  describe('4. Order Rating & Feedback (+5 Bonus Points)', () => {
    it('validates rating range (1-5) and awards 5 bonus points on COMPLETED order', async () => {
      await assert.rejects(
        () => FeedbackService.createFeedback({ orderId: '507f1f77bcf86cd799439011', rating: 6 }),
        (err) => {
          assert.equal(err.statusCode, 400);
          return true;
        }
      );

      Order.findById = () => ({
        populate: async () => ({
          _id: '507f1f77bcf86cd799439011',
          code: 'ORD-100',
          status: ORDER_STATUS.COMPLETED,
          isActive: IS_ACTIVE.TRUE,
          paymentMethod: PAYMENT_METHOD.CASH,
          customerId: { _id: '507f1f77bcf86cd799439022', fullName: 'Nguyễn Văn A', phone: '0901234567' },
        }),
      });
      Feedback.findOne = async () => null;
      CustomerService.adjustPoints = async () => ({ success: true });

      let createdPayload = null;
      Feedback.create = async (doc) => {
        createdPayload = doc;
        return { ...doc, _id: '507f1f77bcf86cd799439099' };
      };
      Feedback.findById = () => {
        const chain = {
          populate: () => chain,
          then: (resolve) =>
            resolve({
              ...createdPayload,
              _id: '507f1f77bcf86cd799439099',
            }),
        };
        return chain;
      };

      const saved = await FeedbackService.createFeedback({
        orderId: '507f1f77bcf86cd799439011',
        rating: 5,
        comment: 'Đồ uống rất ngon, phục vụ nhanh!',
      });

      assert.equal(saved.rating, 5);
      assert.equal(saved.bonusPointsAwarded, 5);
      assert.equal(saved.customerName, 'Nguyễn Văn A');
    });
  });
});
