const mongoose = require('mongoose');
const { IS_ACTIVE } = require('../enums');

const toppingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Topping', toppingSchema);
