const mongoose = require('mongoose');
const User = require('../models/User');
const Session = require('../models/Session');
const {
  SESSION_COOKIE_NAME,
  LEGACY_SESSION_MAX_AGE_MS,
  SESSION_MAX_AGE_MS,
  clearSessionCookie,
  setSessionCookie,
  verifySessionToken,
} = require('../session');

async function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const session = verifySessionToken(token);
  const reject = (message) => {
    clearSessionCookie(res);
    return res.status(401).json({ success: false, message });
  };

  if (!session) return reject('Invalid session');

  const now = Date.now();
  const sessionAge = now - session.issuedAt;
  if (sessionAge < 0 || sessionAge >= SESSION_MAX_AGE_MS) {
    return reject('Session expired');
  }

  const loadStoredSession = () =>
    Session.findOne({ sessionId: session.sessionId })
      .select('role userId legacy revokedAt expiresAt')
      .lean();

  let storedSession = await loadStoredSession();
  if (!storedSession && sessionAge <= LEGACY_SESSION_MAX_AGE_MS) {
    try {
      await Session.create({
        sessionId: session.sessionId,
        role: session.role,
        userId: session.userId,
        legacy: true,
        revokedAt: null,
        expiresAt: new Date(session.issuedAt + SESSION_MAX_AGE_MS),
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }

    storedSession = await loadStoredSession();
  }

  if (
    !storedSession ||
    storedSession.role !== session.role ||
    storedSession.userId !== session.userId ||
    storedSession.revokedAt ||
    new Date(storedSession.expiresAt).getTime() <= now
  ) {
    return reject('Session expired');
  }

  if (session.role === 'user') {
    if (!mongoose.isValidObjectId(session.userId)) return reject('Invalid session');

    const userExists = await User.exists({ _id: session.userId, role: 'user' });
    if (!userExists) {
      await Session.deleteOne({ sessionId: session.sessionId });
      return reject('User account not found');
    }
  }

  req.auth = {
    role: session.role,
    userId: session.userId,
    sessionId: session.sessionId,
  };
  if (storedSession.legacy) {
    setSessionCookie(
      res,
      token,
      new Date(session.issuedAt + SESSION_MAX_AGE_MS)
    );
  }
  return next();
}

module.exports = requireAuth;
