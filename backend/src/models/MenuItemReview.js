const mongoose = require('mongoose');

const menuItemReviewSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 300,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number from 1 to 5.',
      },
    },
  },
  { timestamps: true }
);

menuItemReviewSchema.index(
  { itemId: 1, userId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.MenuItemReview ||
  mongoose.model('MenuItemReview', menuItemReviewSchema);
