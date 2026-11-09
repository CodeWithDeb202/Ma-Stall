const express = require('express');
const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const MembershipPayment = require('../models/MembershipPayment');
const MembershipAttendance = require('../models/MembershipAttendance');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAuth, requireAdmin);

function isValidMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getApprovalDate(reviewedAt, month) {
  return reviewedAt
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(reviewedAt))
    : `${month}-01`;
}

router.get('/users', async (req, res) => {
  try {
    const payments = await MembershipPayment.find({ status: 'Approved' })
      .populate('userId', 'name username email')
      .select('userId membershipMonth reviewedAt')
      .sort({ reviewedAt: -1, createdAt: -1 })
      .lean();

    const usersById = new Map();

    payments.forEach((payment) => {
      const user = payment.userId;
      if (!user) return;

      const userId = String(user._id);

      if (!usersById.has(userId)) {
        usersById.set(userId, {
          _id: userId,
          name: user.name || '',
          username: user.username || '',
          email: user.email || '',
          activeMonths: [],
        });
      }

      const entry = usersById.get(userId);
      if (!entry.activeMonths.includes(payment.membershipMonth)) {
        entry.activeMonths.push(payment.membershipMonth);
      }
    });

    return res.json({ success: true, users: [...usersById.values()] });
  } catch (error) {
    console.error('Load admin membership attendance users:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load membership users.',
    });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const month = typeof req.query.month === 'string'
      ? req.query.month.trim()
      : '';

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID is required.',
      });
    }

    if (!isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        message: 'Valid month is required.',
      });
    }

    const approvedPayment = await MembershipPayment.findOne({
      userId,
      membershipMonth: month,
      status: 'Approved',
      membershipStatus: { $ne: 'Deactivated' },
    })
      .select('reviewedAt')
      .sort({ reviewedAt: -1, createdAt: -1 })
      .lean();

    if (!approvedPayment) {
      return res.status(403).json({
        success: false,
        message: 'This membership month is not approved.',
      });
    }

    const [records, membershipItems] = await Promise.all([
      MembershipAttendance.find({
        userId,
        date: { $regex: '^' + month + '-' },
      }).select('date status createdAt updatedAt').sort({ date: 1 }).lean(),

      Membership.find({
        userId,
        date: { $regex: '^' + month + '-' },
      }).select('menuItemId itemName price').lean(),
    ]);

    const uniqueItems = new Map();

    membershipItems.forEach((item) => {
      const key = String(item.menuItemId || item.itemName);
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, Number(item.price) || 0);
      }
    });

    const dailyTotal = [...uniqueItems.values()]
      .reduce((total, price) => total + price, 0);

    const tickedDays = records.filter(
      (record) => record.status === 'Tick'
    ).length;

    const monthlyTotal = Number((tickedDays * dailyTotal).toFixed(2));

    return res.json({
      success: true,
      month,
      approvalDate: getApprovalDate(approvedPayment.reviewedAt, month),
      records,
      dailyTotal: Number(dailyTotal.toFixed(2)),
      tickedDays,
      monthlyTotal,
    });
  } catch (error) {
    console.error('Load admin membership attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load attendance.',
    });
  }
});

router.patch('/:userId/:date', async (req, res) => {
  try {
    const { userId, date } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID is required.',
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'Valid date is required.',
      });
    }

    if (!['Tick', 'Cross'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Tick or Cross.',
      });
    }

    const month = date.slice(0, 7);

    const approvedPayment = await MembershipPayment.findOne({
      userId,
      membershipMonth: month,
      status: 'Approved',
      membershipStatus: { $ne: 'Deactivated' },
    }).select('reviewedAt').lean();

    if (!approvedPayment) {
      return res.status(403).json({
        success: false,
        message: 'This membership month is not approved.',
      });
    }

    const approvalDate = getApprovalDate(approvedPayment.reviewedAt, month);

    if (date < approvalDate) {
      return res.status(400).json({
        success: false,
        message: 'Attendance cannot be changed before membership approval.',
      });
    }

    const record = await MembershipAttendance.findOneAndUpdate(
      { userId, date },
      { $set: { status } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: 'Attendance updated successfully.',
      record,
    });
  } catch (error) {
    console.error('Update admin membership attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update attendance.',
    });
  }
});

module.exports = router;
