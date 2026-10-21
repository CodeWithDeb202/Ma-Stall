const mongoose = require('mongoose');
const sellingProductSchema = new mongoose.Schema(
  {
    menuItem: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);
sellingProductSchema.index({ menuItem: 1 });
module.exports = mongoose.model('SellingProduct', sellingProductSchema);
