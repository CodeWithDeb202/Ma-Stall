const mongoose = require('mongoose');

const membershipPaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    membershipMonth: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      required: true,
    },
    membershipStatus: {
      type: String,
      enum: ['Active', 'Deactivated'],
      default: 'Active',
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    deactivatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

membershipPaymentSchema.index(
  { userId: 1, membershipMonth: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'Pending' },
  }
);

module.exports = mongoose.models.MembershipPayment ||
  mongoose.model('MembershipPayment', membershipPaymentSchema);
