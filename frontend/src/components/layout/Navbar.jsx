'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError('');

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Logout failed. Please try again.');
      }

      router.replace('/');
      router.refresh();
    } catch (error) {
      setLogoutError(error.message || 'Unable to logout. Please try again.');
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#D8E5D8] bg-white px-3 py-2 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#176B45] bg-white shadow-sm sm:h-11 sm:w-11">
          <Image
            src="/om-sai-krishna-logo.webp"
            alt="Omm Sai Shri Krishna logo"
            width={44}
            height={44}
            priority
            className="h-full w-full rounded-full object-contain"
          />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-[#174D35] sm:text-xl">
            Omm Sai Shri Krishna
          </h1>
          <p className="hidden text-xs text-[#52715D] sm:block">
            Daily investment and income management
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-full border border-[#D8E5D8] bg-[#F1F7F0] px-4 py-2 text-xs font-semibold text-[#176B45] transition hover:bg-[#E1EFE2] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>

        {logoutError && (
          <p role="alert" className="text-xs text-red-600">
            {logoutError}
          </p>
        )}
      </div>
    </header>
  );
}
