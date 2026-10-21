const express = require('express');
const StockProduct = require('../models/StockProduct');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const normalizeProductName = name => String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

router.use(requireAuth);

const validDate = date => {
  if (date === '' || date == null) return true;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

router.get('/', async (req, res) => {
  try {
    const products = await StockProduct.find({}).sort({ updatedAt: -1, createdAt: -1 }).lean();
    res.json({ success: true, products });
  } catch (error) {
    console.error('Load stock products:', error.message);
    res.status(500).json({ success: false, message: 'Stock products load heiparila nahi.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { date = '', productName, category, quantity = '', price = '' } = req.body || {};

    if (!validDate(date)) {
      return res.status(400).json({ success: false, message: 'Date valid nuhen.' });
    }
    if (typeof productName !== 'string' || !productName.trim() || productName.trim().length > 150) {
      return res.status(400).json({ success: false, message: 'Product name required.' });
    }
    if (!['Permanent Stock', 'Stock Products'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Category select kara.' });
    }

    const normalizedName = normalizeProductName(productName);

    const existingProducts = await StockProduct.find({})
      .select('_id productName')
      .lean();

    const duplicate = existingProducts.some(
      item => normalizeProductName(item.productName) === normalizedName
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `"${productName.trim()}" product already achhi. Duplicate product save heipariba nahi. Existing product ku edit kara.`
      });
    }

    const quantityText = String(quantity ?? '').trim();
    if (quantityText.length > 40) {
      return res.status(400).json({ success: false, message: 'Quantity maximum 40 characters.' });
    }

    let parsedPrice = null;
    if (price !== '' && price !== null && price !== undefined) {
      parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price valid heba darkar.' });
      }
    }

    const product = await StockProduct.create({
      date: date || '',
      productName: productName.trim(),
      category,
      quantity: quantityText,
      price: parsedPrice
    });
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Save stock product:', error.message);
    res.status(500).json({ success: false, message: 'Stock product save heiparila nahi.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { date = '', quantity = '' } = req.body || {};

    if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    if (!validDate(date)) {
      return res.status(400).json({ success: false, message: 'Date valid nuhen.' });
    }

    const quantityText = String(quantity ?? '').trim();
    if (quantityText.length > 40) {
      return res.status(400).json({ success: false, message: 'Quantity maximum 40 characters.' });
    }

    const product = await StockProduct.findByIdAndUpdate(
      req.params.id,
      { $set: { date: date || '', quantity: quantityText } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product milila nahi.' });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Update stock product:', error.message);
    res.status(500).json({ success: false, message: 'Stock product update heiparila nahi.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    }
    const product = await StockProduct.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product milila nahi.' });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Delete stock product:', error.message);
    res.status(500).json({ success: false, message: 'Stock product delete heiparila nahi.' });
  }
});

module.exports = router;
