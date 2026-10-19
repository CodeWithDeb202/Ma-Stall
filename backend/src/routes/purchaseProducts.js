const express = require('express');
const PurchaseProduct = require('../models/PurchaseProduct');
const DailyRecord = require('../models/DailyRecord');
const DailyBuyingProduct = require('../models/DailyBuyingProduct');
const StockProduct = require('../models/StockProduct');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

// Recalculate Daily Usage for the day AFTER the purchase date.
// Only the dailyUsage field is changed; manual amounts are preserved.
async function syncNextDayDailyUsage(purchaseDate) {
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-');

  const products = await PurchaseProduct.find({
    date: purchaseDate,
    category: 'Daily Usage',
    checked: true,
    price: { $ne: null },
  }).select('price').lean();

  const total = products.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  await DailyRecord.findOneAndUpdate(
    { date: nextDate },
    {
      $set: { dailyUsage: Math.round((total + Number.EPSILON) * 100) / 100 },
      $setOnInsert: { date: nextDate },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}



// Keep a separate Daily Buying copy for each checked Stock Product.
// Editing the Daily Buying copy never updates the original Purchase Product.
async function syncStockProductToDailyBuying(product, remove = false) {
  const sourceId = product._id;

  if (remove || !product.checked) {
    await DailyBuyingProduct.deleteMany({
      sourcePurchaseProductId: sourceId,
    });
    return;
  }

  await DailyBuyingProduct.findOneAndUpdate(
    { sourcePurchaseProductId: sourceId },
    {
      $set: {
        date: product.date,
        productName: product.productName,
        quantity: product.quantity || '',
        price: product.price == null ? null : product.price,
      },
      $setOnInsert: {
        sourcePurchaseProductId: sourceId,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
}


// Sync Permanent Stock purchases to Stock, linked by purchase ID.
async function syncPermanentStockPurchase(product, remove = false) {
  if (remove || !product.checked) {
    await StockProduct.deleteMany({ sourcePurchaseProductId: product._id });
    return;
  }

  await StockProduct.findOneAndUpdate(
    { sourcePurchaseProductId: product._id },
    {
      $set: {
        date: product.date,
        productName: product.productName,
        category: 'Permanent Stock',
        quantity: product.quantity || '',
        price: product.price == null ? null : product.price
      },
      $setOnInsert: { sourcePurchaseProductId: product._id }
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );
}

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
    if (!['Daily Usage', 'Stock Product', 'Permanent Stock'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Valid category select kara.' });
    }

    const cleanName = productName.trim().toLocaleLowerCase().replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase());

    const existingProducts = await PurchaseProduct.find({ date }).select('productName').lean();
    const duplicate = existingProducts.some(
      (item) => item.productName.trim().toLocaleLowerCase() === cleanName.toLocaleLowerCase()
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `"${cleanName}" ei date pain already achhi.`,
      });
    }

    const product = await PurchaseProduct.create({
      date,
      productName: cleanName,
      category,
      quantity: '',
      price: null,
      checked: false,
    });

    if (product.category === 'Daily Usage') {
      await syncNextDayDailyUsage(product.date);
    }

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

    if (product.category === 'Daily Usage') {
      await syncNextDayDailyUsage(product.date);
    }

    if (product.category === 'Stock Product') {
      await syncStockProductToDailyBuying(product, !product.checked);
    }

    if (product.category === 'Permanent Stock') {
      await syncPermanentStockPurchase(product, !product.checked);
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

    if (product.category === 'Daily Usage') {
      await syncNextDayDailyUsage(product.date);
    }

    if (product.category === 'Stock Product') {
      await syncStockProductToDailyBuying(product, true);
    }

    if (product.category === 'Permanent Stock') {
      await syncPermanentStockPurchase(product, true);
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
