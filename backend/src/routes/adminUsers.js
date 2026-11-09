const express = require('express');
const router = express.Router();
const User = require('../models/User');
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
