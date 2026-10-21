const mongoose = require('mongoose');
const sellingRecordSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    sellingProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellingProduct',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number.',
      },
    },
  },
  { timestamps: true }
);
sellingRecordSchema.index(
  { date: 1, sellingProductId: 1 },
  { unique: true }
);
module.exports = mongoose.model('SellingRecord', sellingRecordSchema);
