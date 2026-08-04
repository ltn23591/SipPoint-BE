const mongoose = require('mongoose');

// Một dòng định mức: cần bao nhiêu nguyên liệu (theo đơn vị của nguyên liệu đó)
const recipeItemSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
    },
    // Định mức tiêu hao cho 1 đơn vị sản phẩm
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Công thức (BOM) - mỗi sản phẩm gắn với đúng một công thức duy nhất
const productRecipeSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    items: {
      type: [recipeItemSchema],
      default: [],
    },
    isActive: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'product_recipes',
  }
);

module.exports = mongoose.model('ProductRecipe', productRecipeSchema);
