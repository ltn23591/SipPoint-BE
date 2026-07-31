const mongoose = require('mongoose');
const { IS_ACTIVE } = require('../enums');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      default: 'home_hero',
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: String,
      enum: [IS_ACTIVE.FALSE, IS_ACTIVE.TRUE],
      default: IS_ACTIVE.TRUE,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
