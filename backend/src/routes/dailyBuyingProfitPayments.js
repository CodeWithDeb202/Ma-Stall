const express = require('express');
const DailyBuyingProfitPayment = require('../models/DailyBuyingProfitPayment');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// Read saved payment statuses
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date.',
        });
      }

      filter.date = date;
    }

    const payments = await DailyBuyingProfitPayment.find(filter).lean();

    return res.json({ success: true, payments });
  } catch (error) {
    console.error('Load profit payments error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not load payment statuses.',
    });
  }
});

// Mark one person's share as paid
router.put('/:date/:person', async (req, res) => {
  try {
    const { date, person } = req.params;
    const allowedPeople = ['deb', 'puja', 'lija'];

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !allowedPeople.includes(person)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date or person.',
      });
    }

    const payment = await DailyBuyingProfitPayment.findOneAndUpdate(
      { date, person },
      { $set: { paid: true } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({
      success: true,
      payment,
      message: 'Payment marked as paid.',
    });
  } catch (error) {
    console.error('Update profit payment error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not update payment status.',
    });
  }
});

module.exports = router;
