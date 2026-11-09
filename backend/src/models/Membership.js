const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0.01,
  },
}, { timestamps: true });

membershipSchema.index(
  { userId: 1, date: 1, menuItemId: 1 },
  { unique: true }
);

module.exports = mongoose.models.Membership ||
  mongoose.model('Membership', membershipSchema);
