const express = require('express');
const mongoose = require('mongoose');
const MembershipPayment = require('../models/MembershipPayment');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const payments = await MembershipPayment.find()
      .populate('userId', 'name username email')
      .populate('reviewedBy', 'name username')
      .populate('deactivatedBy', 'name username')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Load membership payment requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load membership payment requests.',
    });
  }
});

// Approve or reject a pending payment.
router.patch('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, adminNote = '' } = req.body || {};

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment request ID.',
      });
    }

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Approved or Rejected.',
      });
    }

    if (typeof adminNote !== 'string' || adminNote.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Admin note must be 500 characters or fewer.',
      });
    }

    const payment = await MembershipPayment.findOneAndUpdate(
      { _id: paymentId, status: 'Pending' },
      {
        $set: {
          status,
          adminNote: adminNote.trim(),
          reviewedBy: req.auth.userId,
          reviewedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name username email')
      .populate('reviewedBy', 'name username')
      .populate('deactivatedBy', 'name username');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Pending payment request not found. It may already have been reviewed.',
      });
    }

    return res.json({
      success: true,
      message: `Membership payment ${status.toLowerCase()} successfully.`,
      payment,
    });
  } catch (error) {
    console.error('Review membership payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to review membership payment.',
    });
  }
});

// Deactivate an approved membership without changing payment history.
router.patch('/:paymentId/deactivate', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!mongoose.isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment request ID.',
      });
    }

    const payment = await MembershipPayment.findOneAndUpdate(
      {
        _id: paymentId,
        status: 'Approved',
        membershipStatus: { $ne: 'Deactivated' },
      },
      {
        $set: {
          membershipStatus: 'Deactivated',
          deactivatedAt: new Date(),
          deactivatedBy: req.auth.userId,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name username email')
      .populate('reviewedBy', 'name username')
      .populate('deactivatedBy', 'name username');

    if (!payment) {
      const existingPayment = await MembershipPayment.findById(paymentId).lean();

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          message: 'Membership payment not found.',
        });
      }

      if (existingPayment.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: 'Only approved memberships can be deactivated.',
        });
      }

      return res.status(409).json({
        success: false,
        message: 'This membership is already deactivated.',
      });
    }

    return res.json({
      success: true,
      message: 'Membership deactivated successfully.',
      payment,
    });
  } catch (error) {
    console.error('Deactivate membership:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to deactivate membership.',
    });
  }
});

module.exports = router;
