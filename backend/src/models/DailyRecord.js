const mongoose = require('mongoose');

const dailyRecordSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    invest: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyUsage: {
      type: Number,
      default: 0,
      min: 0,
    },
    income: {
      type: Number,
      default: 0,
      min: 0,
    },
    cash: {
      type: Number,
      default: 0,
      min: 0,
    },
    purseCash: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

dailyRecordSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('DailyRecord', dailyRecordSchema);
