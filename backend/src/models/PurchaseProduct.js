const mongoose = require('mongoose');

const purchaseProductSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },
  category: {
    type: String,
    required: true,
    enum: ['Daily Usage', 'Stock Product'],
  },
  quantity: {
    type: String,
    default: '',
    trim: true,
    maxlength: 40,
  },
  price: {
    type: Number,
    default: null,
    min: 0,
  },
  checked: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

purchaseProductSchema.index({ date: -1, createdAt: 1 });

module.exports = mongoose.model('PurchaseProduct', purchaseProductSchema);
