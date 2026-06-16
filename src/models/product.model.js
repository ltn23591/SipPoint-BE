const mongoose = require('mongoose');

const product = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // Lưu chỉ public_id của Cloudinary hoặc file name
    image: {
      type: String,
      required: true,
      trim: true,
    },
    // Tùy chọn: Lưu multiple images
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    stock: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
    collection: 'products',
  }
);

product.index({ name: 'text', description: 'text' });
product.index({ category: 1 });
product.index({ price: 1 });
product.index({ isActive: 1 });
product.index({ isDeleted: 1 });

module.exports = mongoose.model('Product', product);
