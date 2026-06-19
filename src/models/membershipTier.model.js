const mongoose = require('mongoose');

const membershipTierSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipProgram',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    minPoints: {
      type: Number,
      required: true,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Tránh trùng name trong cùng một chương trình
membershipTierSchema.index({ programId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('MembershipTier', membershipTierSchema);
