const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  ingredients: {
    type: [String],
    required: true,
    validate: {
      validator: (items) =>
        Array.isArray(items) &&
        items.length > 0 &&
        items.every((item) => typeof item === 'string' && item.trim()),
      message: 'At least one valid ingredient is required.',
    },
  },
  images: {
    type: [{
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    }],
    required: true,
    validate: {
      validator: (items) => Array.isArray(items) && items.length >= 1 && items.length <= 5,
      message: 'Upload between 1 and 5 images.',
    },
  },
  price: {
    type: Number,
    required: true,
    min: 0.01,
  },
  offer: {
    type: String,
    trim: true,
    maxlength: 100,
    default: '',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
  },
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
