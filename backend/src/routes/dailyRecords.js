const express = require('express');
const DailyRecord = require('../models/DailyRecord');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const records = await DailyRecord.find().sort({ date: -1 }).lean();
    return res.json({ success: true, records });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load records' });
  }
});

router.put('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { invest, income, cash } = req.body || {};

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    const updates = {};
    for (const field of ['invest', 'income', 'cash']) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        const value = req.body[field];
        if (value === '' || value === null || value === undefined) {
          continue;
        }
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount < 0) {
          return res.status(400).json({ success: false, message: `Invalid ${field}` });
        }
        updates[field] = amount;
      }
    }

    const record = await DailyRecord.findOneAndUpdate(
      { date },
      { $set: updates, $setOnInsert: { date } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, record });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Record update conflict; retry once' });
    }
    return res.status(500).json({ success: false, message: 'Could not save record' });
  }
});

router.delete('/:date', async (req, res) => {
  try {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date'
      });
    }

    const deletedRecord = await DailyRecord.findOneAndDelete({ date });

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    return res.json({
      success: true,
      message: 'Record deleted successfully',
      date: deletedRecord.date
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete record'
    });
  }
});

module.exports = router;
