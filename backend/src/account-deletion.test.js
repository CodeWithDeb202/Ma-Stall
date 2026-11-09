const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const http = require('node:http');
const test = require('node:test');
const mongoose = require('mongoose');
const Membership = require('./models/Membership');
const MembershipAttendance = require('./models/MembershipAttendance');
const MembershipPayment = require('./models/MembershipPayment');
const MenuItemReview = require('./models/MenuItemReview');
const Notification = require('./models/Notification');
const Session = require('./models/Session');
const User = require('./models/User');
const { createSessionToken, SESSION_MAX_AGE_MS } = require('./session');

const userA = '0123456789abcdef01234567';
const userB = 'abcdefabcdefabcdefabcdef';
const adminId = 'fedcbafedcbafedcbafedcba';

test('account deletion removes only the authenticated owner records transactionally', async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const originals = {
    startSession: mongoose.startSession,
    sessionFindOne: Session.findOne,
    sessionCreate: Session.create,
    sessionDeleteMany: Session.deleteMany,
    sessionDeleteOne: Session.deleteOne,
    userExists: User.exists,
    userFindOne: User.findOne,
    userDeleteOne: User.deleteOne,
    membershipDeleteMany: Membership.deleteMany,
    attendanceDeleteMany: MembershipAttendance.deleteMany,
    paymentDeleteMany: MembershipPayment.deleteMany,
    reviewDeleteMany: MenuItemReview.deleteMany,
    notificationDeleteMany: Notification.deleteMany,
  };
  process.env.SESSION_SECRET = 'account-deletion-test-secret';

  const userRecords = [{ _id: userA, role: 'user' }, { _id: userB, role: 'user' }];
  const notificationRecords = [
    { _id: 'notification-a', recipientId: userA },
    { _id: 'notification-b', recipientId: userB },
    { _id: 'notification-admin', recipientId: adminId },
  ];
  const sessionRecords = [
    { sessionId: 'session-a-current', role: 'user', userId: userA },
    { sessionId: 'session-a-other-device', role: 'user', userId: userA },
    { sessionId: 'session-b', role: 'user', userId: userB },
    { sessionId: 'session-admin', role: 'admin', userId: null },
  ];
  let failUserDelete = false;
  let notificationDeleteFilter;

  const deleteQuery = (operation) => ({
    session() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve().then(operation).then(resolve, reject);
    },
  });
  const transactionalDelete = (records, filter, matches) =>
    deleteQuery(() => {
      const before = records.length;
      for (let index = records.length - 1; index >= 0; index -= 1) {
        if (matches(records[index], filter)) records.splice(index, 1);
      }
      return { deletedCount: before - records.length };
    });

  Session.findOne = ({ sessionId }) => ({
    select() {
      return this;
    },
    async lean() {
      return sessionRecords.find((session) => session.sessionId === sessionId) || null;
    },
  });
  Session.create = async (session) => {
    sessionRecords.push(session);
    return session;
  };
  Session.deleteMany = (filter) =>
    transactionalDelete(
      sessionRecords,
      filter,
      (record, query) => record.role === query.role && record.userId === query.userId
    );
  Session.deleteOne = async ({ sessionId }) => {
    const index = sessionRecords.findIndex((session) => session.sessionId === sessionId);
    if (index >= 0) sessionRecords.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  };
  User.exists = async ({ _id, role }) =>
    userRecords.some((user) => user._id === String(_id) && user.role === role)
      ? { _id }
      : null;
  User.findOne = (filter) => ({
    session() {
      return Promise.resolve(
        userRecords.find(
          (user) => user._id === String(filter._id) && user.role === filter.role
        ) || null
      );
    },
  });
  User.deleteOne = (filter) =>
    deleteQuery(() => {
      if (failUserDelete) throw new Error('Simulated account deletion failure');
      const index = userRecords.findIndex(
        (user) => user._id === String(filter._id) && user.role === filter.role
      );
      if (index >= 0) userRecords.splice(index, 1);
      return { deletedCount: index >= 0 ? 1 : 0 };
    });

  const deletePersonalRecords = (model) => {
    model.deleteMany = (filter) =>
      transactionalDelete(
        [],
        filter,
        (record, query) => String(record.userId) === String(query.userId)
      );
  };
  deletePersonalRecords(Membership);
  deletePersonalRecords(MembershipAttendance);
  deletePersonalRecords(MembershipPayment);
  deletePersonalRecords(MenuItemReview);
  Notification.deleteMany = (filter) => {
    notificationDeleteFilter = filter;
    return transactionalDelete(
      notificationRecords,
      filter,
      (record, query) => String(record.recipientId) === String(query.recipientId)
    );
  };

  mongoose.startSession = async () => ({
    async withTransaction(callback) {
      const snapshots = [
        [userRecords, structuredClone(userRecords)],
        [notificationRecords, structuredClone(notificationRecords)],
        [sessionRecords, structuredClone(sessionRecords)],
      ];
      try {
        await callback();
      } catch (error) {
        for (const [records, snapshot] of snapshots) {
          records.splice(0, records.length, ...snapshot);
        }
        throw error;
      }
    },
    async endSession() {},
  });

  const issuedAt = Date.now();
  const sessionId = crypto.randomUUID();
  sessionRecords[0].sessionId = sessionId;
  sessionRecords[0].expiresAt = new Date(issuedAt + SESSION_MAX_AGE_MS);
  const token = createSessionToken('user', userA, issuedAt, sessionId);
  const app = express();
  app.use(require('cookie-parser')());
  app.use('/api/auth', require('./routes/auth'));
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const cookie = `ma_stall_session=${token}`;

    const deletionResponse = await fetch(`${baseUrl}/api/auth/account`, {
      method: 'DELETE',
      headers: { cookie },
    });
    assert.equal(deletionResponse.status, 200);
    assert.deepEqual(notificationDeleteFilter, { recipientId: userA });
    assert.deepEqual(notificationRecords, [
      { _id: 'notification-b', recipientId: userB },
      { _id: 'notification-admin', recipientId: adminId },
    ]);
    assert.deepEqual(userRecords, [{ _id: userB, role: 'user' }]);
    assert.deepEqual(
      sessionRecords.map(({ userId, role }) => ({ userId, role })),
      [
        { userId: userB, role: 'user' },
        { userId: null, role: 'admin' },
      ]
    );

    const oldSessionResponse = await fetch(`${baseUrl}/api/auth/account`, {
      headers: { cookie },
    });
    assert.equal(oldSessionResponse.status, 401);

    failUserDelete = true;
    userRecords.push({ _id: userA, role: 'user' });
    notificationRecords.push({ _id: 'notification-a-retry', recipientId: userA });
    sessionRecords.push({
      sessionId: 'session-a-retry',
      role: 'user',
      userId: userA,
      expiresAt: new Date(issuedAt + SESSION_MAX_AGE_MS),
    });

    const failedDeletionResponse = await fetch(`${baseUrl}/api/auth/account`, {
      method: 'DELETE',
      headers: { cookie },
    });
    assert.equal(failedDeletionResponse.status, 500);
    assert.ok(userRecords.some((user) => user._id === userA));
    assert.ok(notificationRecords.some((item) => item.recipientId === userA));
    assert.ok(sessionRecords.some((item) => item.userId === userA));
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    mongoose.startSession = originals.startSession;
    Session.findOne = originals.sessionFindOne;
    Session.create = originals.sessionCreate;
    Session.deleteMany = originals.sessionDeleteMany;
    Session.deleteOne = originals.sessionDeleteOne;
    User.exists = originals.userExists;
    User.findOne = originals.userFindOne;
    User.deleteOne = originals.userDeleteOne;
    Membership.deleteMany = originals.membershipDeleteMany;
    MembershipAttendance.deleteMany = originals.attendanceDeleteMany;
    MembershipPayment.deleteMany = originals.paymentDeleteMany;
    MenuItemReview.deleteMany = originals.reviewDeleteMany;
    Notification.deleteMany = originals.notificationDeleteMany;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});
