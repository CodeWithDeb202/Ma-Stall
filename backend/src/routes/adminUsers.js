const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('name username createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Could not load registered users:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not load users.',
    });
  }
});

router.post('/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipient user ID.',
      });
    }

    if (!title || title.length > 120 || !message || message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Title (1–120 characters) and message (1–2000 characters) are required.',
      });
    }

    const recipient = await User.findOne({ _id: userId, role: 'user' })
      .select('_id')
      .lean();
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.',
      });
    }

    const notification = await Notification.create({
      recipientId: recipient._id,
      title,
      message,
      isRead: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Notification sent successfully.',
      notification,
    });
  } catch (error) {
    console.error('[ADMIN NOTIFICATIONS] Could not send notification:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to send notification.',
    });
  }
});


router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    const deletedUser = await User.findOneAndDelete({
      _id: userId,
      role: 'user',
    });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found or cannot be deleted.',
      });
    }

    await Session.deleteMany({
      role: 'user',
      userId: deletedUser._id.toString(),
    });
    await Notification.deleteMany({ recipientId: deletedUser._id });

    return res.json({
      success: true,
      message: 'User permanently deleted.',
      userId: deletedUser._id,
    });
  } catch (error) {
    console.error('Could not delete user:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not delete user.',
    });
  }
});

module.exports = router;
