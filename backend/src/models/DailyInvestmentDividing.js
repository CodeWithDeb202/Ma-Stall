const mongoose = require('mongoose');

const dailyInvestmentDividingSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  dailyKharcha: { type: Number, required: true, min: 0, default: 0 },
  stockKharcha: { type: Number, required: true, min: 0, default: 0 },
  income: { type: Number, required: true, min: 0, default: 0 },
  cash: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('DailyInvestmentDividing', dailyInvestmentDividingSchema);
