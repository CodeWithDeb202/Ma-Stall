'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingNavbar({ showProfile = false }) {
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        const data = await response.json();

        if (active) {
          const validSession =
            response.ok &&
            data.success === true &&
            data.authenticated === true &&
            ['user', 'admin'].includes(data.role);

          setRole(validSession ? data.role : null);
          setUserId(validSession && data.role === 'user' ? data.userId : null);
        }
      } catch {
        if (active) setRole(null);
      } finally {
        if (active) setCheckedSession(true);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

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
          aria-label="Omm Sai Krishna home"
        >
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#176B45] bg-white shadow-sm sm:h-11 sm:w-11">
            <Image
              src="/om-sai-krishna-logo.webp"
              alt="Omm Sai Krishna logo"
              width={44}
              height={44}
              priority
              className="h-full w-full rounded-full object-contain"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight text-[#174D35] sm:text-xl">
              Omm Sai Krishna
            </span>
            <span className="hidden text-xs text-[#52715D] sm:block">
              Daily investment and income management
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!checkedSession ? null : role ? (
            showProfile ? (
              <Link
                href={profileHref}
                aria-label={role === 'admin' ? 'Go to admin dashboard' : 'Go to user account'}
                title={role === 'admin' ? 'Admin Dashboard' : 'My Account'}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#176B45] transition hover:ring-2 hover:ring-[#B8D8C2]"
              >
                <Image
                  src="/default-profile.svg"
                  alt="Profile"
                  width={44}
                  height={44}
                  priority
                  className="h-full w-full object-cover"
                />
              </Link>
            ) : (
              <Link
                href={role === 'admin' ? '/admin/dashboard' : `/u/${userId}`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#176B45] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#174D35]"
              >
                Navigate to Dashboard
              </Link>
            )
          ) : (
            <>
              <Link
                href="/auth/register"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#176B45] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#174D35] sm:px-4"
              >
                Get Started
              </Link>

              <Link
                href="/auth/login"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#176B45] px-3 py-2 text-sm font-semibold text-[#176B45] transition hover:bg-[#E8F2E8] sm:px-4"
              >
                User Login
              </Link>

              <Link
                href="/auth/admin/login"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#176B45] px-3 py-2 text-sm font-semibold text-[#176B45] transition hover:bg-[#E8F2E8] sm:px-4"
              >
                Admin Login
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
