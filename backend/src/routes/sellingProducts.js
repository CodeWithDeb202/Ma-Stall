const express = require('express');
const mongoose = require('mongoose');
const SellingProduct = require('../models/SellingProduct');
const SellingRecord = require('../models/SellingRecord');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();
router.use(requireAuth);
function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}
router.get('/', async (req, res) => {
  try {
    const date = req.query.date;
    if (date !== undefined && !isValidDate(date)) {
      return res.status(400).json({ success: false, message: 'Valid date select kara.' });
    }
    const [products, savedDates, records] = await Promise.all([
      SellingProduct.find({}).sort({ createdAt: 1 }).lean(),
      SellingRecord.distinct('date'),
      date ? SellingRecord.find({ date }).lean() : Promise.resolve([]),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    return res.json({
      success: true,
      products,
      dates: [...new Set([today, ...(date ? [date] : []), ...savedDates])]
        .sort((a, b) => b.localeCompare(a)),
      records,
    });
  } catch (error) {
    console.error('Load selling products error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load selling products.' });
  }
});
router.post('/', async (req, res) => {
  try {
    const { menuItem, price } = req.body || {};
    const name = typeof menuItem === 'string' ? menuItem.trim().replace(/\s+/g, ' ') : '';
    const numericPrice = Number(price);
    if (!name || name.length > 150) {
      return res.status(400).json({ success: false, message: 'Menu item enter kara (maximum 150 characters).' });
    }
    if (price === '' || price === null || price === undefined ||
        !Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, message: 'Valid price enter kara.' });
    }
    const duplicate = await SellingProduct.findOne({
      menuItem: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }).lean();
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Ehi menu item agaru save heichi.' });
    }
    const product = await SellingProduct.create({ menuItem: name, price: numericPrice });
    return res.status(201).json({ success: true, product, message: 'Menu item successfully saved.' });
  } catch (error) {
    console.error('Save selling product error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not save menu item.' });
  }
});
router.put('/quantity', async (req, res) => {
  try {
    const { date, sellingProductId, quantity } = req.body || {};
    if (!isValidDate(date)) {
      return res.status(400).json({ success: false, message: 'Valid date select kara.' });
    }
    if (!mongoose.isValidObjectId(sellingProductId)) {
      return res.status(400).json({ success: false, message: 'Valid menu item select kara.' });
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ success: false, message: 'Quantity 0 ba ta tharu adhika whole number heba darkar.' });
    }
    const productExists = await SellingProduct.exists({ _id: sellingProductId });
    if (!productExists) {
      return res.status(404).json({ success: false, message: 'Menu item milila nahi.' });
    }
    const record = await SellingRecord.findOneAndUpdate(
      { date, sellingProductId },
      { $set: { quantity } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, record, message: 'Selling quantity saved.' });
  } catch (error) {
    console.error('Save selling quantity error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not save selling quantity.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { price } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }
    if (price === '' || price === null || price === undefined ||
        !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'Valid price enter kara.' });
    }
    const product = await SellingProduct.findByIdAndUpdate(
      req.params.id,
      { $set: { price: Number(price) } },
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ success: false, message: 'Menu item milila nahi.' });
    }
    return res.json({ success: true, product, message: 'Price successfully updated.' });
  } catch (error) {
    console.error('Update selling product error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not update price.' });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }
    const product = await SellingProduct.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Menu item milila nahi.' });
    }
    await SellingRecord.deleteMany({ sellingProductId: product._id });
    return res.json({ success: true, message: 'Menu item successfully deleted.' });
  } catch (error) {
    console.error('Delete selling product error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not delete menu item.' });
  }
});
module.exports = router;
