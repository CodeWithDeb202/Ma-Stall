const express = require('express');
const MenuItem = require('../models/MenuItem');
const MenuItemReview = require('../models/MenuItemReview');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

const upload = require('../middleware/upload');
const uploadToCloudinary = require('../middleware/uploadCloudinary');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

router.get('/public', async (req, res) => {
  try {
    const items = await MenuItem.find({})
      .sort({ createdAt: -1 })
      .select('name description price offer rating images createdAt')
      .lean();

    return res.json({ success: true, items });
  } catch (error) {
    console.error('Load public menu items:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load menu items.',
    });
  }
});

router.get('/public/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    const item = await MenuItem.findById(itemId)
      .select('name description ingredients price offer rating images createdAt')
      .lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    return res.json({ success: true, item });
  } catch (error) {
    console.error('Load public menu item details:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load the menu item.',
    });
  }
});


// Public reviews for a menu item.
router.get('/public/:itemId/reviews', async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const item = await MenuItem.findById(itemId).select('_id').lean();
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const reviews = await MenuItemReview.find({ itemId })
      .select('userId username message rating createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const averageRating = reviews.length
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
      : 0;

    return res.json({
      success: true,
      reviews,
      reviewCount: reviews.length,
      averageRating,
    });
  } catch (error) {
    console.error('Load menu item reviews:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load reviews.' });
  }
});

// Users may delete their own reviews; admins may delete any review.
router.delete('/:itemId/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const { itemId, reviewId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(itemId) || !/^[a-f\d]{24}$/i.test(reviewId)) {
      return res.status(400).json({ success: false, message: 'Invalid menu item or review ID.' });
    }

    const isAdmin = req.auth?.role === 'admin';
    const isUser = req.auth?.role === 'user' && Boolean(req.auth?.userId);

    if (!isAdmin && !isUser) {
      return res.status(403).json({ success: false, message: 'You are not allowed to delete this review.' });
    }

    const review = await MenuItemReview.findOne({ _id: reviewId, itemId })
      .select('_id userId')
      .lean();

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const isOwner = isUser &&
      String(review.userId) === String(req.auth.userId);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'You can delete only your own review.' });
    }

    await MenuItemReview.deleteOne({ _id: reviewId, itemId });

    const summary = await MenuItemReview.aggregate([
      { $match: { itemId: review.itemId } },
      { $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      } },
    ]);

    return res.json({
      success: true,
      message: 'Review deleted successfully.',
      reviewCount: summary[0]?.reviewCount || 0,
      averageRating: summary[0]
        ? Math.round(summary[0].averageRating * 10) / 10
        : 0,
    });
  } catch (error) {
    console.error('Delete menu item review:', error.message);
    return res.status(500).json({ success: false, message: 'Could not delete review.' });
  }
});

// Only an authenticated normal user can submit a review.
router.post('/:itemId/reviews', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { message, rating } = req.body || {};

    if (req.auth?.role !== 'user' || !req.auth?.userId) {
      return res.status(403).json({ success: false, message: 'Only logged-in users can submit reviews.' });
    }

    if (!/^[a-f\d]{24}$/i.test(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    if (typeof message !== 'string' || message.trim().length < 2 || message.trim().length > 300) {
      return res.status(400).json({ success: false, message: 'Review must be 2–300 characters long.' });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Choose a rating from 1 to 5 stars.' });
    }

    const [item, user] = await Promise.all([
      MenuItem.findById(itemId).select('_id').lean(),
      User.findOne({ _id: req.auth.userId, role: 'user' }).select('username').lean(),
    ]);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found. Please log in again.' });
    }

    const existingReview = await MenuItemReview.findOne({ itemId, userId: req.auth.userId }).select('_id').lean();
    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this item.',
      });
    }

    const review = await MenuItemReview.create({
      itemId,
      userId: req.auth.userId,
      username: user.username,
      message: message.trim(),
      rating,
    });

    const summary = await MenuItemReview.aggregate([
      { $match: { itemId: review.itemId } },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
    ]);

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      review: {
        _id: review._id,
        username: review.username,
        message: review.message,
        rating: review.rating,
        createdAt: review.createdAt,
      },
      averageRating: summary[0] ? Math.round(summary[0].averageRating * 10) / 10 : 0,
      reviewCount: summary[0]?.reviewCount || 0,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this item.' });
    }
    console.error('Create menu item review:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to submit your review.' });
  }
});

router.get('/:itemId', requireAuth, async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.itemId)) return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    const item = await MenuItem.findById(req.params.itemId).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });
    return res.json({ success: true, item });
  } catch (error) {
    console.error('Load menu item details:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load the menu item.' });
  }
});

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, items });
  } catch (error) {
    console.error('Load menu items:', error.message);
    res.status(500).json({ success: false, message: 'Unable to load menu items.' });
  }
});

router.post('/', (req, res, next) => {
  upload.array('images', 5)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Pratyeka image maximum 5 MB heba.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? 'Maximum 5 images upload karipariba.'
            : error.message,
      });
    }
    next();
  });
}, async (req, res) => {
  const uploadedImages = [];

  try {
    const { name, description, ingredients, price, offer = '' } = req.body;

    if (!req.files || req.files.length < 1 || req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Upload between 1 and 5 images.',
      });
    }

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      return res.status(400).json({ success: false, message: 'Valid item name required.' });
    }

    if (typeof description !== 'string' || !description.trim() || description.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Valid description required.' });
    }

    let parsedIngredients;
    try {
      parsedIngredients = JSON.parse(ingredients);
    } catch {
      return res.status(400).json({ success: false, message: 'Ingredients list valid nuhen.' });
    }

    if (
      !Array.isArray(parsedIngredients) ||
      parsedIngredients.length === 0 ||
      parsedIngredients.some((item) => typeof item !== 'string' || !item.trim())
    ) {
      return res.status(400).json({ success: false, message: 'Add at least one ingredient.' });
    }

    const parsedPrice = Number(price);
    if (price === '' || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Price 0 ru adhika heba darkar.' });
    }

    if (typeof offer !== 'string' || offer.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Offer maximum 100 characters.' });
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({ success: false, message: 'Cloudinary configuration missing.' });
    }

    for (const file of req.files) {
      uploadedImages.push(await uploadToCloudinary(file));
    }

    const item = await MenuItem.create({
      name: name.trim(),
      description: description.trim(),
      ingredients: parsedIngredients.map((item) => item.trim()),
      images: uploadedImages,
      price: parsedPrice,
      offer: offer.trim(),
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    if (uploadedImages.length) {
      await Promise.allSettled(
        uploadedImages.map((image) => cloudinary.uploader.destroy(image.publicId)),
      );
    }

    console.error('Save menu item error:', error);
    res.status(500).json({ success: false, message: 'Unable to save the menu item.' });
  }
});


router.put('/:itemId', (req, res, next) => {
  upload.array('images', 5)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Pratyeka image maximum 5 MB heba.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? 'Maximum 5 images upload karipariba.'
            : error.message,
      });
    }
    next();
  });
}, async (req, res) => {
  const uploadedImages = [];

  try {
    const { itemId } = req.params;
    if (!/^[a-f\d]{24}$/i.test(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const item = await MenuItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const oldImages = item.images.map((image) => ({ ...image.toObject() }));
    const { name, description, ingredients, price, offer = '' } = req.body;

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      return res.status(400).json({ success: false, message: 'Valid item name required.' });
    }
    if (typeof description !== 'string' || !description.trim() || description.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Valid description required.' });
    }

    let parsedIngredients;
    try {
      parsedIngredients = JSON.parse(ingredients);
    } catch {
      return res.status(400).json({ success: false, message: 'Ingredients list valid nuhen.' });
    }
    if (!Array.isArray(parsedIngredients) || parsedIngredients.length === 0 ||
        parsedIngredients.some((value) => typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({ success: false, message: 'Add at least one ingredient.' });
    }

    const parsedPrice = Number(price);
    if (price === '' || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Price 0 ru adhika heba darkar.' });
    }
    if (typeof offer !== 'string' || offer.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Offer maximum 100 characters.' });
    }

    if (req.files?.length) {
      if (!process.env.CLOUDINARY_CLOUD_NAME ||
          !process.env.CLOUDINARY_API_KEY ||
          !process.env.CLOUDINARY_API_SECRET) {
        return res.status(500).json({ success: false, message: 'Cloudinary configuration missing.' });
      }
      for (const file of req.files) {
        uploadedImages.push(await uploadToCloudinary(file));
      }
    }

    item.name = name.trim();
    item.description = description.trim();
    item.ingredients = parsedIngredients.map((value) => value.trim());
    item.price = parsedPrice;
    item.offer = offer.trim();
    if (uploadedImages.length) item.images = uploadedImages;

    await item.save();

    if (uploadedImages.length) {
      await Promise.allSettled(oldImages.map((image) => image.publicId
        ? cloudinary.uploader.destroy(image.publicId)
        : Promise.resolve()));
    }

    return res.json({ success: true, item });
  } catch (error) {
    if (uploadedImages.length) {
      await Promise.allSettled(
        uploadedImages.map((image) => cloudinary.uploader.destroy(image.publicId))
      );
    }
    console.error('Update menu item error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update the menu item.' });
  }
});


router.delete('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!/^[a-f\d]{24}$/i.test(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID.',
      });
    }

    const item = await MenuItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    const imagePublicIds = item.images
      .map((image) => image.publicId)
      .filter(Boolean);

    await MenuItem.findByIdAndDelete(itemId);

    // Image cleanup failure should not undo a successful database deletion.
    const cleanupResults = await Promise.allSettled(
      imagePublicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
    );

    cleanupResults.forEach((result) => {
      if (result.status === 'rejected') {
        console.error('Cloudinary image cleanup failed:', result.reason);
      }
    });

    return res.json({
      success: true,
      message: 'Menu item deleted successfully.',
      deletedItemId: itemId,
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to delete the menu item.',
    });
  }
});

module.exports = router;
