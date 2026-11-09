'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Warning from '@/components/reusable/Warning';

export default function UserAccountPage() {
  const router = useRouter();
  const { userId } = useParams();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const response = await fetch('/api/auth/account', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (response.status === 401) {
          router.replace('/auth/login');
          return;
        }

        if (response.status === 403) {
          router.replace(`/u/${userId}`);
          return;
        }

        if (!response.ok || !data.success || !data.user) {
          setMessage(data.message || 'Could not load your account.');
          return;
        }

      } catch {
        if (active) setMessage('Unable to connect to the server.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [router, userId]);

  async function handleDeleteAccount() {
    setShowDeleteWarning(false);

    setDeleting(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Could not delete your account.');
        setMessageType('error');
        setDeleting(false);
        return;
      }

      router.replace('/auth/login');
      router.refresh();
    } catch {
      setMessage('Unable to connect to the server. Please try again.');
      setMessageType('error');
      setDeleting(false);
    }
  }

  async function handleLogout() {
    setShowLogoutWarning(false);
    setLoggingOut(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        setMessage(data.message || 'Could not log out. Please try again.');
        setMessageType('error');
        setLoggingOut(false);
        return;
      }

      router.replace('/auth/login');
      router.refresh();
    } catch {
      setMessage('Unable to connect to the server. Please try again.');
      setMessageType('error');
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FBF7] px-4">
        <p className="text-sm font-medium text-[#52715D]">Loading your account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FBF7] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        {message && (
          <p
            role="alert"
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              messageType === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message}
          </p>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(`/u/${userId}`)}
            disabled={deleting || loggingOut}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8E5D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#174D35] transition hover:bg-[#EEF5EE] disabled:opacity-60"
          >
            Back to home
          </button>

          <button
            type="button"
            onClick={() => setShowLogoutWarning(true)}
            disabled={deleting || loggingOut}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8E5D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#174D35] transition hover:bg-[#EEF5EE] disabled:opacity-60"
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>

        <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-red-700">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-[#52715D]">
            This permanently deletes your account and all personal data associated with it.
            This action cannot be undone.
          </p>

          <button
            type="button"
            onClick={() => setShowDeleteWarning(true)}
            disabled={deleting || loggingOut}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? 'Deleting account...' : 'Delete account'}
          </button>
        </section>
      </div>

      <Warning
        open={showLogoutWarning}
        title="Log out?"
        message="Are you sure you want to log out of your account?"
        confirmText="Log out"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutWarning(false)}
        loading={loggingOut}
      />

      <Warning
        open={showDeleteWarning}
        title="Delete account?"
        message="Permanently delete your account and all personal data associated with it? This action cannot be undone." 
        confirmText="Delete account"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteWarning(false)}
        loading={deleting}
      />
    </main>
  );
}
