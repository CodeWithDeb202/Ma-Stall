const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const Session = require('./models/Session');
const requireAuth = require('./middleware/requireAuth');
const {
  SESSION_MAX_AGE_MS,
  LEGACY_SESSION_MAX_AGE_MS,
  createSession,
  createSessionToken,
  revokeSession,
  setSessionCookie,
  verifySessionToken,
} = require('./session');

const userId = '0123456789abcdef01234567';

test('session issuance uses independent IDs and a fixed eight-day expiry', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const originalCreate = Session.create;
  const originalUpdateOne = Session.updateOne;
  const sessions = new Map();
  process.env.SESSION_SECRET = 'session-test-secret';
  Session.create = async (session) => {
    sessions.set(session.sessionId, session);
    return session;
  };
  Session.updateOne = async (filter, update) => {
    let session = sessions.get(filter.sessionId);
    if (!session) {
      session = {
        sessionId: filter.sessionId,
        role: filter.role,
        userId: filter.userId,
        ...update.$setOnInsert,
      };
      sessions.set(filter.sessionId, session);
    }
    Object.assign(session, update.$set);
    return { matchedCount: 1, upsertedCount: 0 };
  };

  try {
    const first = await createSession('user', userId);
    const second = await createSession('user', userId);
    const adminSession = await createSession('admin');
    const firstToken = verifySessionToken(first.token);
    const secondToken = verifySessionToken(second.token);
    const adminToken = verifySessionToken(adminSession.token);

    assert.ok(firstToken);
    assert.ok(secondToken);
    assert.ok(adminToken);
    assert.equal(adminToken.role, 'admin');
    assert.notEqual(firstToken.sessionId, secondToken.sessionId);
    assert.notEqual(firstToken.sessionId, adminToken.sessionId);
    assert.equal(first.expiresAt.getTime(), firstToken.issuedAt + SESSION_MAX_AGE_MS);
    assert.equal(second.expiresAt.getTime(), secondToken.issuedAt + SESSION_MAX_AGE_MS);
    assert.equal(adminSession.expiresAt.getTime(), adminToken.issuedAt + SESSION_MAX_AGE_MS);
    assert.equal(sessions.size, 3);

    let cookieOptions;
    setSessionCookie(
      {
        cookie(name, value, options) {
          cookieOptions = { name, value, ...options };
        },
      },
      first.token,
      first.expiresAt
    );
    assert.equal(cookieOptions.name, 'ma_stall_session');
    assert.equal(cookieOptions.httpOnly, true);
    assert.equal(cookieOptions.sameSite, 'lax');
    assert.equal(cookieOptions.expires.getTime(), first.expiresAt.getTime());

    await revokeSession(first.token);
    assert.ok(sessions.get(first.sessionId).revokedAt);
    assert.equal(sessions.has(second.sessionId), true);
    assert.equal(sessions.has(adminSession.sessionId), true);
  } finally {
    Session.create = originalCreate;
    Session.updateOne = originalUpdateOne;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});

test('authentication middleware rejects an expired signed session and clears its cookie', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'session-test-secret';

  try {
    const expiredToken = createSessionToken(
      'admin',
      '',
      Date.now() - SESSION_MAX_AGE_MS - 1,
      crypto.randomUUID()
    );
    const response = {
      statusCode: null,
      cleared: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      clearCookie() {
        this.cleared = true;
      },
    };
    let nextCalled = false;

    await requireAuth(
      { cookies: { ma_stall_session: expiredToken } },
      response,
      () => {
        nextCalled = true;
      }
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.message, 'Session expired');
    assert.equal(response.cleared, true);
    assert.equal(nextCalled, false);
  } finally {
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});

test('authentication middleware rejects a session missing from server-side storage', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const originalFindOne = Session.findOne;
  process.env.SESSION_SECRET = 'session-test-secret';
  let createCalled = false;
  Session.findOne = () => ({
    select() {
      return this;
    },
    async lean() {
      return null;
    },
  });
  const originalCreate = Session.create;
  Session.create = async () => {
    createCalled = true;
  };

  try {
    const token = createSessionToken(
      'admin',
      '',
      Date.now() - LEGACY_SESSION_MAX_AGE_MS - 1,
      crypto.randomUUID()
    );
    const response = {
      statusCode: null,
      cleared: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      clearCookie() {
        this.cleared = true;
      },
    };

    await requireAuth({ cookies: { ma_stall_session: token } }, response, () => {
      assert.fail('A session without a server-side record must not authenticate');
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.cleared, true);
    assert.equal(createCalled, false);
  } finally {
    Session.findOne = originalFindOne;
    Session.create = originalCreate;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});

test('a valid legacy session is migrated without sliding its expiry', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const originalFindOne = Session.findOne;
  const originalCreate = Session.create;
  let storedSession = null;
  process.env.SESSION_SECRET = 'session-test-secret';
  Session.findOne = () => ({
    select() {
      return this;
    },
    async lean() {
      return storedSession;
    },
  });
  Session.create = async (session) => {
    storedSession = session;
    return session;
  };

  try {
    const issuedAt = Date.now() - 60 * 60 * 1000;
    const token = createSessionToken('admin', '', issuedAt, crypto.randomUUID());
    const response = {
      cookieOptions: null,
      cookie(name, value, options) {
        this.cookieOptions = { name, value, ...options };
      },
      clearCookie() {},
    };
    let nextCalled = false;

    await requireAuth({ cookies: { ma_stall_session: token } }, response, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(storedSession.legacy, true);
    assert.equal(
      storedSession.expiresAt.getTime(),
      issuedAt + SESSION_MAX_AGE_MS
    );
    assert.equal(
      response.cookieOptions.expires.getTime(),
      issuedAt + SESSION_MAX_AGE_MS
    );
  } finally {
    Session.findOne = originalFindOne;
    Session.create = originalCreate;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});

test('a revoked session cannot be reused with its original signed cookie', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const originalFindOne = Session.findOne;
  process.env.SESSION_SECRET = 'session-test-secret';
  const issuedAt = Date.now();
  const token = createSessionToken('admin', '', issuedAt, crypto.randomUUID());
  Session.findOne = () => ({
    select() {
      return this;
    },
    async lean() {
      return {
        role: 'admin',
        userId: null,
        revokedAt: new Date(),
        expiresAt: new Date(issuedAt + SESSION_MAX_AGE_MS),
      };
    },
  });

  try {
    const response = {
      statusCode: null,
      cleared: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      clearCookie() {
        this.cleared = true;
      },
    };

    await requireAuth({ cookies: { ma_stall_session: token } }, response, () => {
      assert.fail('A revoked session must not authenticate');
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.cleared, true);
  } finally {
    Session.findOne = originalFindOne;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});
