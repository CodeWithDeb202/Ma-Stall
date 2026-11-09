const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const http = require('node:http');
const test = require('node:test');
const Notification = require('./models/Notification');
const Session = require('./models/Session');
const User = require('./models/User');
const { createSessionToken, SESSION_MAX_AGE_MS } = require('./session');

const userId = '0123456789abcdef01234567';
const adminUserId = 'abcdefabcdefabcdefabcdef';

test('notification routes enforce admin sending and restrict reads to the authenticated user', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const originals = {
    sessionFindOne: Session.findOne,
    userExists: User.exists,
    userFindOne: User.findOne,
    notificationCreate: Notification.create,
    notificationFind: Notification.find,
    notificationCountDocuments: Notification.countDocuments,
    notificationUpdateMany: Notification.updateMany,
  };
  process.env.SESSION_SECRET = 'notification-test-secret';

  const issuedSessions = new Map();
  const sentNotifications = [];
  let listFilter;
  let countFilter;
  let readFilter;

  Session.findOne = ({ sessionId }) => ({
    select() {
      return this;
    },
    async lean() {
      return issuedSessions.get(sessionId) || null;
    },
  });
  User.exists = async ({ _id, role }) =>
    role === 'user' && [userId, adminUserId].includes(String(_id))
      ? { _id }
      : null;
  User.findOne = () => ({
    select() {
      return this;
    },
    async lean() {
      return { _id: userId };
    },
  });
  Notification.create = async (data) => {
    const notification = { _id: 'notification-id', ...data, createdAt: new Date() };
    sentNotifications.push(notification);
    return notification;
  };
  Notification.find = (filter) => {
    listFilter = filter;
    return {
      sort() {
        return this;
      },
      async lean() {
        return sentNotifications.filter(
          (notification) => String(notification.recipientId) === String(filter.recipientId)
        );
      },
    };
  };
  Notification.countDocuments = async (filter) => {
    countFilter = filter;
    return sentNotifications.filter(
      (notification) =>
        String(notification.recipientId) === String(filter.recipientId) &&
        notification.isRead === false
    ).length;
  };
  Notification.updateMany = async (filter, update) => {
    readFilter = filter;
    let modifiedCount = 0;
    sentNotifications.forEach((notification) => {
      if (
        String(notification.recipientId) === String(filter.recipientId) &&
        notification.isRead === false
      ) {
        notification.isRead = update.$set.isRead;
        modifiedCount += 1;
      }
    });
    return { modifiedCount };
  };

  function makeToken(role, id) {
    const issuedAt = Date.now();
    const sessionId = crypto.randomUUID();
    issuedSessions.set(sessionId, {
      sessionId,
      role,
      userId: id || null,
      legacy: false,
      revokedAt: null,
      expiresAt: new Date(issuedAt + SESSION_MAX_AGE_MS),
    });
    return createSessionToken(role, id || '', issuedAt, sessionId);
  }

  const app = express();
  app.use(require('cookie-parser')());
  app.use(express.json());
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/admin/users', require('./routes/adminUsers'));
  app.use('/api/notifications', require('./routes/notifications'));
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const adminCookie = `ma_stall_session=${makeToken('admin')}`;
    const userCookie = `ma_stall_session=${makeToken('user', userId)}`;

    const adminSessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { cookie: adminCookie },
    });
    const adminSession = await adminSessionResponse.json();
    assert.equal(adminSessionResponse.status, 200);
    assert.equal(adminSession.role, 'admin');
    assert.equal(adminSession.sessionId, adminCookie.split('.')[1]);

    const sendResponse = await fetch(
      `${baseUrl}/api/admin/users/${userId}/notifications`,
      {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ title: 'Update', message: 'A personal update' }),
      }
    );
    assert.equal(sendResponse.status, 201);
    assert.equal(sentNotifications[0].recipientId, userId);
    assert.equal(sentNotifications[0].title, 'Update');
    assert.equal(sentNotifications[0].isRead, false);

    const deniedSend = await fetch(
      `${baseUrl}/api/admin/users/${userId}/notifications`,
      {
        method: 'POST',
        headers: {
          cookie: userCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ title: 'No', message: 'Should be denied' }),
      }
    );
    assert.equal(deniedSend.status, 403);

    const invalidSend = await fetch(
      `${baseUrl}/api/admin/users/${userId}/notifications`,
      {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ title: ' ', message: '' }),
      }
    );
    assert.equal(invalidSend.status, 400);

    const listResponse = await fetch(`${baseUrl}/api/notifications`, {
      headers: { cookie: userCookie },
    });
    const listResult = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listResult.notifications.length, 1);
    assert.equal(String(listFilter.recipientId), userId);

    const countResponse = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { cookie: userCookie },
    });
    assert.equal((await countResponse.json()).count, 1);
    assert.equal(countFilter.isRead, false);

    const readResponse = await fetch(`${baseUrl}/api/notifications/read`, {
      method: 'POST',
      headers: { cookie: userCookie },
    });
    assert.equal((await readResponse.json()).markedRead, 1);
    assert.equal(String(readFilter.recipientId), userId);
    assert.equal(sentNotifications[0].isRead, true);

    const otherUserToken = makeToken('user', adminUserId);
    const otherUserResponse = await fetch(`${baseUrl}/api/notifications`, {
      headers: { cookie: `ma_stall_session=${otherUserToken}` },
    });
    const otherUserResult = await otherUserResponse.json();
    assert.equal(otherUserResult.notifications.length, 0);

    const anonymousResponse = await fetch(`${baseUrl}/api/notifications`);
    assert.equal(anonymousResponse.status, 401);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    Session.findOne = originals.sessionFindOne;
    User.exists = originals.userExists;
    User.findOne = originals.userFindOne;
    Notification.create = originals.notificationCreate;
    Notification.find = originals.notificationFind;
    Notification.countDocuments = originals.notificationCountDocuments;
    Notification.updateMany = originals.notificationUpdateMany;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});
