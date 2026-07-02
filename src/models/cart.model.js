const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        variants: [
          {
            variantId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'ProductVariant',
            },
            name: {
              type: String,
              required: true,
            },
            priceAdjustment: {
              type: Number,
              required: true,
              default: 0,
            },
          },
        ],
        note: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

module.exports = mongoose.model('Cart', cartSchema);
