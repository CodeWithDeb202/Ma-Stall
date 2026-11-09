const mongoose = require('mongoose');

const membershipAttendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\\d{4}-\\d{2}-\\d{2}$/,
    },
    status: {
      type: String,
      enum: ['Tick', 'Cross'],
      required: true,
    },
  },
  { timestamps: true }
);

membershipAttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.MembershipAttendance ||
  mongoose.model('MembershipAttendance', membershipAttendanceSchema);
