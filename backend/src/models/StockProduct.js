const mongoose = require('mongoose');

const stockProductSchema = new mongoose.Schema({
  date: {
    type: String,
    default: '',
    validate: {
      validator: value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
      message: 'Invalid date.'
    }
  },
  productName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  category: {
    type: String,
    required: true,
    enum: ['Permanent Stock', 'Stock Products']
  },
  quantity: {
    type: String,
    default: '',
    trim: true,
    maxlength: 40
  },
  price: {
    type: Number,
    default: null,
    min: 0
  }
}, { timestamps: true });

stockProductSchema.index({ category: 1, createdAt: 1 });

module.exports = mongoose.model('StockProduct', stockProductSchema);
