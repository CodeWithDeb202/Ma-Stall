const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth, (req, res, next) => {
  if (req.auth?.role !== 'user' || !mongoose.isValidObjectId(req.auth.userId)) {
    return res.status(403).json({
      success: false,
      message: 'User notification access required.',
    });
  }
  return next();
});

router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.auth.userId,
    })
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('[NOTIFICATIONS] Could not load notifications:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load notifications.',
    });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.auth.userId,
      isRead: false,
    });

    return res.json({ success: true, count });
  } catch (error) {
    console.error('[NOTIFICATIONS] Could not load unread count:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load unread notifications.',
    });
  }
});

router.post('/read', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.auth.userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({
      success: true,
      markedRead: result.modifiedCount,
    });
  } catch (error) {
    console.error('[NOTIFICATIONS] Could not mark notifications as read:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to mark notifications as read.',
    });
  }
});

module.exports = router;
