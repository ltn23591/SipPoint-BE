const mongoose = require('mongoose');

const staffRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffRole', staffRoleSchema);
