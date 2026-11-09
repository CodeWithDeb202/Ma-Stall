const crypto = require('crypto');
const Session = require('./models/Session');

const SESSION_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;
const LEGACY_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SESSION_COOKIE_NAME = 'ma_stall_session';

function createSessionToken(role, userId = '', issuedAt = Date.now(), sessionId = crypto.randomUUID()) {
  if (!['admin', 'user'].includes(role)) {
    throw new Error('Invalid session role');
  }

  const normalizedUserId = role === 'user' ? String(userId) : '-';
  if (role === 'user' && !/^[a-f\d]{24}$/i.test(normalizedUserId)) {
    throw new Error('Invalid user ID');
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) throw new Error('SESSION_SECRET is missing');

  const payload = `${issuedAt}.${sessionId}.${role}.${normalizedUserId}`;
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 5) return null;

  const [issuedAtText, sessionId, role, userId, signature] = parts;
  if (
    !/^\d+$/.test(issuedAtText) ||
    !/^[0-9a-f-]{36}$/i.test(sessionId) ||
    !['admin', 'user'].includes(role) ||
    !/^[a-f\d]{64}$/i.test(signature) ||
    (role === 'admin' && userId !== '-') ||
    (role === 'user' && !/^[a-f\d]{24}$/i.test(userId))
  ) {
    return null;
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) return null;

  const issuedAt = Number(issuedAtText);
  if (!Number.isSafeInteger(issuedAt)) return null;

  const payload = `${issuedAtText}.${sessionId}.${role}.${userId}`;
  const expectedSignature = crypto.createHmac('sha256', sessionSecret).update(payload).digest();
  const suppliedSignature = Buffer.from(signature, 'hex');
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  return {
    issuedAt,
    sessionId,
    role,
    userId: userId === '-' ? null : userId,
  };
}

async function createSession(role, userId = '') {
  const issuedAt = Date.now();
  const sessionId = crypto.randomUUID();
  const normalizedUserId = role === 'user' ? String(userId) : null;
  const expiresAt = new Date(issuedAt + SESSION_MAX_AGE_MS);
  const token = createSessionToken(role, normalizedUserId || '', issuedAt, sessionId);

  await Session.create({
    sessionId,
    role,
    userId: normalizedUserId,
    legacy: false,
    revokedAt: null,
    expiresAt,
  });

  return { token, sessionId, expiresAt };
}

async function revokeSession(token) {
  const session = verifySessionToken(token);
  if (!session) return false;

  await Session.updateOne(
    {
      sessionId: session.sessionId,
      role: session.role,
      userId: session.userId,
    },
    {
      $set: { revokedAt: new Date() },
      $setOnInsert: {
        legacy: false,
        expiresAt: new Date(session.issuedAt + SESSION_MAX_AGE_MS),
      },
    },
    { upsert: true }
  );
  return true;
}

function setSessionCookie(res, token, expiresAt) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

function clearSessionCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

module.exports = {
  SESSION_COOKIE_NAME,
  LEGACY_SESSION_MAX_AGE_MS,
  SESSION_MAX_AGE_MS,
  clearSessionCookie,
  createSession,
  createSessionToken,
  revokeSession,
  setSessionCookie,
  verifySessionToken,
};
