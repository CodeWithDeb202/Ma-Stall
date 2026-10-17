const express = require('express');
const PurchaseProduct = require('../models/PurchaseProduct');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

const validDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      if (!validDate(req.query.date)) {
        return res.status(400).json({ success: false, message: 'Invalid date.' });
      }
      filter.date = req.query.date;
    }

    const products = await PurchaseProduct.find(filter)
      .sort({ date: -1, createdAt: 1 })
      .lean();

    return res.json({ success: true, products });
  } catch (error) {
    console.error('Load purchase products:', error.message);
    return res.status(500).json({ success: false, message: 'Products load heiparila nahi.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { date, productName, category } = req.body || {};

    if (!validDate(date)) {
      return res.status(400).json({ success: false, message: 'Valid date select kara.' });
    }
    if (typeof productName !== 'string' || !productName.trim() || productName.trim().length > 150) {
      return res.status(400).json({ success: false, message: 'Product name enter kara.' });
    }
    if (!['Daily Usage', 'Stock Product'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Valid category select kara.' });
    }

    const product = await PurchaseProduct.create({
      date,
      productName: productName.trim(),
      category,
      quantity: '',
      price: null,
      checked: false,
    });

    return res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Save purchase product:', error.message);
    return res.status(500).json({ success: false, message: 'Product save heiparila nahi.' });
  }
});

// Checkbox checked: save optional quantity and price.
// Checkbox unchecked: clear both values for this product only.
router.put('/:id', async (req, res) => {
  try {
    const { checked, quantity, price } = req.body || {};

    if (typeof checked !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid checkbox status.' });
    }

    const updates = { checked };

    if (!checked) {
      updates.quantity = '';
      updates.price = null;
    } else {
      const quantityText = String(quantity ?? '').trim();
      let parsedPrice = null;

      if (price !== '' && price !== null && price !== undefined) {
        parsedPrice = Number(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({ success: false, message: 'Price valid heba darkar.' });
        }
      }

      if (quantityText.length > 40) {
        return res.status(400).json({ success: false, message: 'Quantity maximum 40 characters.' });
      }

      updates.quantity = quantityText;
      updates.price = parsedPrice;
    }

    const product = await PurchaseProduct.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product milila nahi.' });
    }

    return res.json({ success: true, product });
  } catch (error) {
    console.error('Update purchase product:', error.message);
    return res.status(500).json({ success: false, message: 'Product update heiparila nahi.' });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    const product = await PurchaseProduct.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product milila nahi.',
      });
    }

    return res.json({
      success: true,
      message: 'Product delete hela.',
      product,
    });
  } catch (error) {
    console.error('Delete purchase product:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Product delete heiparila nahi.',
    });
  }
});

module.exports = router;
