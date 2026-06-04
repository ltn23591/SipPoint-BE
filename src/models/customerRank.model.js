const mongoose = require('mongoose');

const customerRankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    minSpent: {
      type: Number,
      required: true,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'customer_ranks',
  }
);

module.exports = mongoose.model('CustomerRank', customerRankSchema);
