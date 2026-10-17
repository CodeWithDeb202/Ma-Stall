const mongoose = require('mongoose');

const dailyBuyingProfitPaymentSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    person: {
      type: String,
      required: true,
      enum: ['deb', 'puja', 'lija'],
    },
    paid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

dailyBuyingProfitPaymentSchema.index(
  { date: 1, person: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'DailyBuyingProfitPayment',
  dailyBuyingProfitPaymentSchema
);
