const crypto = require('crypto');

function requireAuth(req, res, next) {
  const token = req.cookies?.ma_stall_session;
  const secret = process.env.SESSION_SECRET;

  if (!token || !secret) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return res.status(401).json({ success: false });
  }

  const [issuedAt, nonce, signature] = parts;
  if (!/^\d+$/.test(issuedAt) || !/^[a-f0-9-]+$/i.test(nonce)) {
    return res.status(401).json({ success: false });
  }

  const issuedAtMs = Number(issuedAt);
  const maxAge = 8 * 60 * 60 * 1000;

  if (!Number.isSafeInteger(issuedAtMs) || Date.now() - issuedAtMs < 0 || Date.now() - issuedAtMs > maxAge) {
    return res.status(401).json({ success: false, message: 'Session expired' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${issuedAt}.${nonce}`)
    .digest('hex');

  const supplied = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');

  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ success: false });
  }

  next();
}

module.exports = requireAuth;
