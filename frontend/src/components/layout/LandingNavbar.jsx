'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LandingNavbar({ showProfile = false }) {
  const pathname = usePathname();
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [profileImage, setProfileImage] = useState('');
  const [checkedSession, setCheckedSession] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadRequestId = useRef(0);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session-status', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          if (active) setSessionError(true);
          return;
        }

        const data = await response.json().catch(() => ({}));

        if (active) {
          const validSession =
            response.ok &&
            data.success === true &&
            data.authenticated === true &&
            ['user', 'admin'].includes(data.role);

          setRole(validSession ? data.role : null);
          setUserId(validSession && data.role === 'user' ? data.userId : null);

          if (validSession && data.role === 'user') {
            const accountResponse = await fetch('/api/auth/account', {
              method: 'GET',
              cache: 'no-store',
              credentials: 'include',
            });
            const accountData = await accountResponse.json().catch(() => ({}));

            if (active && accountResponse.ok) {
              setProfileImage(accountData.user?.profileImage || '');
            }
          } else {
            setProfileImage('');
          }
        }
      } catch {
        if (active) setSessionError(true);
      } finally {
        if (active) setCheckedSession(true);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (role !== 'user' || !userId) {
      return undefined;
    }

    let active = true;
    const onNotificationsPage = pathname?.endsWith('/notifications');

    async function refreshUnreadCount() {
      const requestId = ++unreadRequestId.current;
      try {
        const response = await fetch('/api/notifications/unread-count', {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({}));

        if (active && requestId === unreadRequestId.current && response.ok && data.success) {
          setUnreadCount(Number.isInteger(data.count) && data.count > 0 ? data.count : 0);
        }
      } catch {
        // Keep the last known count when a background refresh is temporarily unavailable.
      }
    }

    function handleCountUpdate(event) {
      if (Number.isInteger(event.detail?.count) && event.detail.count >= 0) {
        unreadRequestId.current += 1;
        setUnreadCount(event.detail.count);
      } else {
        refreshUnreadCount();
      }
    }

    function handleVisibilityChange() {
      if (!onNotificationsPage && document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    }

    function handleFocus() {
      if (!onNotificationsPage) refreshUnreadCount();
    }

    const channel = typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel('ma-stall-notifications');
    if (channel) {
      channel.onmessage = (event) => {
        handleCountUpdate({ detail: event.data });
      };
    }

    if (!onNotificationsPage) refreshUnreadCount();
    window.addEventListener('notifications:unread-count', handleCountUpdate);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const refreshInterval = window.setInterval(() => {
      if (!onNotificationsPage && document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    }, 10_000);

    return () => {
      active = false;
      unreadRequestId.current += 1;
      window.clearInterval(refreshInterval);
      window.removeEventListener('notifications:unread-count', handleCountUpdate);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel?.close();
    };
  }, [pathname, role, userId]);

  const profileHref =
    role === 'admin' ? '/admin/dashboard' : userId ? `/u/${userId}/accounts` : '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D8E5D8] bg-white/95 shadow-sm backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 sm:gap-3"
          aria-label="Omm Sai Shri Krishna home"
        >
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#176B45] bg-white shadow-sm sm:h-11 sm:w-11">
            <Image
              src="/om-sai-krishna-logo.webp"
              alt="Omm Sai Shri Krishna logo"
              width={44}
              height={44}
              priority
              className="h-full w-full rounded-full object-contain"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight text-[#174D35] sm:text-xl">
              Omm Sai Shri Krishna
            </span>
            <span className="hidden text-xs text-[#52715D] sm:block">
              Daily investment and income management
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!checkedSession ? (
            <span role="status" aria-label="Loading dashboard" className="inline-flex h-10 w-10 items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#D8E5D8] border-t-[#176B45]" />
            </span>
          ) : sessionError ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#D8E5D8] px-4 py-2 text-sm font-semibold text-[#174D35] transition hover:bg-[#E8F3E9]"
            >
              Retry session check
            </button>
          ) : role ? (
            showProfile ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {role === 'user' && userId && (
                  <Link
                    href={"/u/" + userId + "/notifications"}
                    aria-label="Notifications"
                    title="Notifications"
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#D8E5D8] text-[#176B45] transition hover:bg-[#E8F3E9] hover:ring-2 hover:ring-[#B8D8C2]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                      <path d="M10 21h4" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                href={profileHref}
                aria-label={role === 'admin' ? 'Go to admin dashboard' : 'Go to user account'}
                title={role === 'admin' ? 'Admin Dashboard' : 'My Account'}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#176B45] transition hover:ring-2 hover:ring-[#B8D8C2]"
              >
                <Image
                  src={profileImage || '/default-profile.svg'}
                  alt="Profile"
                  width={44}
                  height={44}
                  priority
                  onError={() => setProfileImage('/default-profile.svg')}
                  className="h-full w-full object-cover"
                />
                </Link>
              </div>
            ) : (
              <Link
                href={role === 'admin' ? '/admin/dashboard' : `/u/${userId}`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#176B45] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#174D35]"
              >
                Dashboard
              </Link>
            )
          ) : (
            <Link
              href="/auth/register"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#176B45] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#174D35] sm:px-4"
            >
              Get Started
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
