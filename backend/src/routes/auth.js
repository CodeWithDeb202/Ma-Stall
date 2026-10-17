const express = require('express');
const crypto = require('crypto');

const router = express.Router();

router.post('/verify', (req, res) => {
  const { secretCode } = req.body || {};
  const expectedCode = process.env.ACCESS_CODE;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!expectedCode || !sessionSecret) {
    return res.status(500).json({
      success: false,
      message: 'Authentication is not configured',
    });
  }

  if (typeof secretCode !== 'string' || secretCode.length > 200) {
    return res.status(400).json({ success: false });
  }

  const supplied = Buffer.from(secretCode);
  const expected = Buffer.from(expectedCode);

  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return res.status(401).json({ success: false });
  }

  const issuedAt = Date.now().toString();
  const nonce = crypto.randomUUID();
  const signature = crypto
    .createHmac('sha256', sessionSecret)
    .update(`${issuedAt}.${nonce}`)
    .digest('hex');
  const token = `${issuedAt}.${nonce}.${signature}`;

  res.cookie('ma_stall_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  return res.json({ success: true });
});

router.get('/session', require('../middleware/requireAuth'), (req, res) => {
  res.json({ success: true, authenticated: true });
});

module.exports = router;
