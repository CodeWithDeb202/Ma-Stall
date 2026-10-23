const express = require('express');
const DailyBuyingProduct = require('../models/DailyBuyingProduct');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// Load all saved products
router.get('/', async (req, res) => {
  try {
    const products = await DailyBuyingProduct.find()
      .sort({ date: -1, createdAt: 1 })
      .lean();

    return res.json({ success: true, products });
  } catch (error) {
    console.error('Load buying products error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not load buying products.',
    });
  }
});

// Save a product
router.post('/', async (req, res) => {
  try {
    const { date, productName, price, quantity } = req.body || {};

    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid date.',
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date.',
      });
    }

    if (
      typeof productName !== 'string' ||
      !productName.trim() ||
      productName.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a product name (maximum 150 characters).',
      });
    }

    const numericPrice = Number(price);
    const quantityText = String(quantity ?? '').trim();

    if (
      quantityText &&
      (
        !/^\d+(?:\.\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|mg|l|ml|pcs|pc|packet|packets|piece|pieces)?$/i.test(quantityText) ||
        Number(quantityText.match(/^\d+(?:\.\d+)?/)[0]) <= 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter a quantity with a unit, e.g. 250 g, 2 kg, 1 packet, or 5 pcs.',
      });
    }

    const product = await DailyBuyingProduct.create({
      date,
      productName: productName.trim(),
      price: numericPrice,
      quantity: quantityText || '',
    });

    return res.status(201).json({
      success: true,
      product,
      message: 'Product successfully saved.',
    });
  } catch (error) {
    console.error('Save buying product error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not save product.',
    });
  }
});


// Update one saved product
router.put('/:id', async (req, res) => {
  try {
    const { productName, price, quantity } = req.body || {};
    const updates = {};

    if (productName !== undefined) {
      if (
        typeof productName !== 'string' ||
        productName.length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: 'Product name maximum 150 characters heba darkar.',
        });
      }

      updates.productName = productName.trim();
    }

    if (price !== undefined) {
      if (price === '' || price === null) {
        updates.price = null;
      } else {
        const numericPrice = Number(price);

        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
          return res.status(400).json({
            success: false,
            message: 'Enter a valid price.',
          });
        }

        updates.price = numericPrice;
      }
    }

    if (quantity !== undefined) {
      const quantityText = String(quantity ?? '').trim();

      if (
        quantityText &&
        (
          !/^\d+(?:\.\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|mg|l|ml|pcs|pc|packet|packets|piece|pieces)?$/i.test(quantityText) ||
          Number(quantityText.match(/^\d+(?:\.\d+)?/)[0]) <= 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Enter a quantity with a unit, e.g. 250 g, 2 kg, 1 packet, or 5 pcs.',
        });
      }

      updates.quantity = quantityText;
    }

    const product = await DailyBuyingProduct.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product milila nahi.',
      });
    }

    return res.json({
      success: true,
      product,
      message: 'Product successfully updated.',
    });
  } catch (error) {
    console.error('Update buying product error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not update product.',
    });
  }
});

// Delete only the selected product
router.delete('/:id', async (req, res) => {
  try {
    const product = await DailyBuyingProduct.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product milila nahi.',
      });
    }

    return res.json({
      success: true,
      message: 'Product successfully deleted.',
    });
  } catch (error) {
    console.error('Delete buying product error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not delete product.',
    });
  }
});

module.exports = router;
