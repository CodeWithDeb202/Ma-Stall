'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const NOTIFICATION_POLL_INTERVAL_MS = 10_000;

function publishUnreadCount(count) {
  const update = { count };
  window.dispatchEvent(
    new CustomEvent('notifications:unread-count', { detail: update })
  );
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('ma-stall-notifications');
    channel.postMessage(update);
    channel.close();
  }
}

function formatCreatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function NotificationInbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const needsInitialRead = useRef(true);
  const mounted = useRef(false);

  const loadNotifications = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (needsInitialRead.current) {
        const readResponse = await fetch('/api/notifications/read', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
        });
        const readResult = await readResponse.json().catch(() => ({}));

        if (!readResponse.ok || !readResult.success) {
          throw new Error(readResult.message || 'Could not mark notifications as read.');
        }

        needsInitialRead.current = false;
        publishUnreadCount(0);
      }

      const response = await fetch('/api/notifications', {
        cache: 'no-store',
        credentials: 'include',
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success || !Array.isArray(result.notifications)) {
        throw new Error(result.message || 'Could not load notifications.');
      }

      if (mounted.current) {
        setNotifications(result.notifications);
        setError('');
        publishUnreadCount(
          result.notifications.filter((notification) => notification.isRead === false).length
        );
      }
    } catch (loadError) {
      if (mounted.current) {
        setError(loadError.message || 'Unable to load notifications.');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const timeoutId = window.setTimeout(() => {
      loadNotifications();
    }, 0);
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadNotifications();
    }, NOTIFICATION_POLL_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadNotifications();
    };
    window.addEventListener('focus', loadNotifications);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted.current = false;
      window.clearTimeout(timeoutId);
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', loadNotifications);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadNotifications]);

  if (loading) {
    return (
      <section
        aria-label="Your notifications"
        aria-busy="true"
        className="flex min-h-48 items-center justify-center rounded-2xl border border-[#D8E5D8] bg-white px-5 py-12"
      >
        <p role="status" className="text-sm text-[#52715D]">
          Loading notifications...
        </p>
      </section>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <section
        aria-label="Your notifications"
        className="rounded-2xl border border-red-200 bg-white px-5 py-8 text-center"
      >
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadNotifications();
          }}
          className="mt-4 rounded-lg bg-[#176B45] px-4 py-2 text-sm font-semibold text-white hover:bg-[#174D35]"
        >
          Retry
        </button>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section
        aria-label="Your notifications"
        className="flex flex-1 items-center justify-center rounded-2xl border border-[#D8E5D8] bg-white px-5 py-12"
      >
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F3E9] text-[#176B45]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </div>
          <h2 className="mt-5 text-xl font-semibold text-[#174D35]">No notifications yet</h2>
          <p className="mt-2 text-sm leading-6 text-[#52715D]">
            You&apos;re all caught up! New notifications and updates will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Your notifications" className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notifications.map((notification) => (
        <article
          key={notification._id}
          className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
            notification.isRead
              ? 'border-[#D8E5D8]'
              : 'border-[#83B995] bg-[#F7FBF7]'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#174D35]">
              {notification.title}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                notification.isRead
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {notification.isRead ? 'Read' : 'Unread'}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-[#42594A]">
            {notification.message}
          </p>
          <time
            dateTime={notification.createdAt}
            className="mt-4 block text-xs text-[#718477]"
          >
            {formatCreatedAt(notification.createdAt)}
          </time>
        </article>
      ))}
    </section>
  );
}
