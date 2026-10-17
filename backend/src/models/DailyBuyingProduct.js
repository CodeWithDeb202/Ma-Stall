const mongoose = require('mongoose');

const dailyBuyingProductSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    productName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 150,
    },
    price: {
      type: Number,
      required: false,
      default: null,
      min: 0,
    },
    quantity: {
      type: String,
      required: false,
      default: '',
      trim: true,
      maxlength: 30,
    },
  },
  { timestamps: true }
);

dailyBuyingProductSchema.index({ date: -1, createdAt: 1 });

module.exports = mongoose.model(
  'DailyBuyingProduct',
  dailyBuyingProductSchema
);
