const express = require('express');
const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const MembershipPayment = require('../models/MembershipPayment');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth, (req, res, next) => {
  if (req.auth?.role !== 'user' || !mongoose.isValidObjectId(req.auth.userId)) {
    return res.status(403).json({ success: false, message: 'User access required.' });
  }
  next();
});

router.get('/status', async (req, res) => {
  try {
    const membershipMonth = typeof req.query.month === 'string'
      ? req.query.month.trim()
      : '';

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(membershipMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Valid membership month is required.',
      });
    }

    const payment = await MembershipPayment.findOne({
      userId: req.auth.userId,
      membershipMonth,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, payment });
  } catch (error) {
    console.error('Load membership payment status:', error);
    return res.status(500).json({ success: false, message: 'Unable to load payment status.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const transactionId = typeof req.body?.transactionId === 'string'
      ? req.body.transactionId.trim()
      : '';
    const membershipMonth = typeof req.body?.membershipMonth === 'string'
      ? req.body.membershipMonth.trim()
      : '';

    if (!name || name.length > 100 || !transactionId || transactionId.length > 120) {
      return res.status(400).json({ success: false, message: 'Valid name and transaction ID are required.' });
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(membershipMonth)) {
      return res.status(400).json({ success: false, message: 'Valid membership month is required.' });
    }

    const existing = await MembershipPayment.findOne({
      userId: req.auth.userId,
      membershipMonth,
      status: 'Pending',
    }).lean();

    if (existing) {
      return res.status(409).json({ success: false, message: 'A payment request is already pending for this month.' });
    }

    const items = await Membership.find({
      userId: req.auth.userId,
      date: { $regex: `^${membershipMonth}-` },
    }).select('menuItemId itemName price').lean();

    if (!items.length) {
      return res.status(400).json({ success: false, message: 'No membership items found for this month.' });
    }

    const uniqueItems = new Map();
    items.forEach((item) => {
      const key = String(item.menuItemId || item.itemName);
      if (!uniqueItems.has(key)) uniqueItems.set(key, Number(item.price) || 0);
    });

    const dailyTotal = [...uniqueItems.values()].reduce((total, price) => total + price, 0);
    const amount = Number((dailyTotal * 30).toFixed(2));

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Membership payment amount is invalid.' });
    }

    const payment = await MembershipPayment.create({
      userId: req.auth.userId,
      membershipMonth,
      name,
      transactionId,
      amount,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment request submitted for admin approval.',
      payment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A payment request is already pending for this month.' });
    }
    console.error('Submit membership payment:', error);
    return res.status(500).json({ success: false, message: 'Unable to submit payment request.' });
  }
});

module.exports = router;
