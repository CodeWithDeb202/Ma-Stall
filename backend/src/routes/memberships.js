const express = require('express');
const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const MenuItem = require('../models/MenuItem');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth, (req, res, next) => {
  if (req.auth?.role !== 'user' || !mongoose.isValidObjectId(req.auth.userId)) {
    return res.status(403).json({ success: false, message: 'Student access required.' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const items = await Membership.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, items });
  } catch (error) {
    console.error('Load memberships:', error);
    return res.status(500).json({ success: false, message: 'Unable to load membership items.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { date, menuItemId } = req.body || {};

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'A valid membership date is required.' });
    }
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ success: false, message: 'Invalid membership date.' });
    }
    if (!mongoose.isValidObjectId(menuItemId)) {
      return res.status(400).json({ success: false, message: 'A valid menu item is required.' });
    }

    const menuItem = await MenuItem.findById(menuItemId).select('name price').lean();
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    const item = await Membership.create({
      userId: req.auth.userId,
      menuItemId: menuItem._id,
      date,
      itemName: menuItem.name,
      price: menuItem.price,
    });
    return res.status(201).json({ success: true, item, message: 'Membership item added.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This item is already added for the selected date.' });
    }
    console.error('Add membership:', error);
    return res.status(500).json({ success: false, message: 'Unable to add membership item.' });
  }
});

router.delete('/:membershipId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.membershipId)) {
      return res.status(400).json({ success: false, message: 'Invalid membership ID.' });
    }
    const deleted = await Membership.findOneAndDelete({
      _id: req.params.membershipId,
      userId: req.auth.userId,
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Membership item not found.' });
    }
    return res.json({ success: true, message: 'Membership item deleted.' });
  } catch (error) {
    console.error('Delete membership:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete membership item.' });
  }
});

module.exports = router;
