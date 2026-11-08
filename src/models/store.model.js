const mongoose = require('mongoose');
const { IS_ACTIVE, PAYMENT_METHOD } = require('../enums');

const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    taxCode: {
      type: String,
      trim: true,
      default: '',
    },
    vatRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.1,
    },
    priceIncludesVat: {
      type: Boolean,
      default: true,
    },
    currency: {
      type: String,
      trim: true,
      default: 'VND',
    },
    timezone: {
      type: String,
      trim: true,
      default: 'Asia/Ho_Chi_Minh',
    },
    wifiName: {
      type: String,
      trim: true,
      default: '',
    },
    wifiPassword: {
      type: String,
      trim: true,
      default: '',
    },
    operatingHours: {
      monFriOpen: { type: String, trim: true, default: '07:00' },
      monFriClose: { type: String, trim: true, default: '22:00' },
      satSunOpen: { type: String, trim: true, default: '07:30' },
      satSunClose: { type: String, trim: true, default: '23:00' },
    },
    paymentMethods: [
      {
        type: String,
        enum: Object.values(PAYMENT_METHOD),
      }
    ],
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Store', storeSchema);
