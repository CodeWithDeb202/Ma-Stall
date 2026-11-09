const express = require('express');
const mongoose = require('mongoose');
const MembershipPayment = require('../models/MembershipPayment');
const MembershipAttendance = require('../models/MembershipAttendance');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth, (req, res, next) => {
  if (req.auth?.role !== 'user' || !mongoose.isValidObjectId(req.auth.userId)) {
    return res.status(403).json({ success: false, message: 'User access required.' });
  }
  next();
});

function isValidMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

async function getActiveMonths(userId) {
  const payments = await MembershipPayment.find({
    userId,
    status: 'Approved',
    membershipStatus: { $ne: 'Deactivated' },
  }).select('membershipMonth').sort({ membershipMonth: 1 }).lean();

  return [...new Set(payments.map((payment) => payment.membershipMonth))];
}

router.get('/', async (req, res) => {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    if (!isValidMonth(month)) {
      return res.status(400).json({ success: false, message: 'Valid month is required.' });
    }

    const approvedPayments = await MembershipPayment.find({
      userId: req.auth.userId,
      status: 'Approved',
      membershipStatus: { $ne: 'Deactivated' },
    }).select('membershipMonth reviewedAt').sort({ membershipMonth: 1 }).lean();

    const activeMonths = [...new Set(
      approvedPayments.map((payment) => payment.membershipMonth)
    )];

    const approvedPayment = approvedPayments.find(
      (payment) => payment.membershipMonth === month
    );

    if (!approvedPayment) {
      return res.status(403).json({
        success: false,
        message: 'This membership month is not active.',
        activeMonths,
      });
    }

    const approvalDate = approvedPayment.reviewedAt
      ? new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(approvedPayment.reviewedAt))
      : `${month}-01`;

    // Return timestamps so the student can see when the admin last marked each date.
    const records = await MembershipAttendance.find({
      userId: req.auth.userId,
      date: { $regex: '^' + month + '-' },
    }).select('date status createdAt updatedAt').sort({ date: 1 }).lean();

    return res.json({ success: true, activeMonths, approvalDate, records });
  } catch (error) {
    console.error('Load membership attendance:', error);
    return res.status(500).json({ success: false, message: 'Unable to load attendance.' });
  }
});

// Student attendance is read-only. Only the admin attendance route can modify records.

module.exports = router;
