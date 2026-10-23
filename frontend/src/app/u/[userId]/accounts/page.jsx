'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Warning from '@/components/reusable/Warning';

export default function UserAccountPage() {
  const router = useRouter();
  const { userId } = useParams();

  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

        setUsername(data.user.username || '');
        setCurrentUsername(data.user.username || '');
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

  async function handleUpdate(event) {
    event.preventDefault();
    setMessage('');

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      setMessage('Username must be 3–30 characters using letters, numbers, or underscores.');
      setMessageType('error');
      return;
    }

    if (!currentPassword || currentPassword.length > 128) {
      setMessage('Enter your current password to save changes.');
      setMessageType('error');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setMessage('Your new password must contain at least 8 characters.');
      setMessageType('error');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setMessage('The new passwords do not match.');
      setMessageType('error');
      return;
    }

    if (newPassword.length > 128) {
      setMessage('The new password cannot exceed 128 characters.');
      setMessageType('error');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          username: normalizedUsername,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Could not update your account.');
        setMessageType('error');
        return;
      }

      const savedUsername = data.user?.username || normalizedUsername;
      setUsername(savedUsername);
      setCurrentUsername(savedUsername);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(data.message || 'Account updated successfully.');
      setMessageType('success');
    } catch {
      setMessage('Unable to connect to the server. Please try again.');
      setMessageType('error');
    } finally {
      setSaving(false);
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

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Logout failed. Please try again.');
        setMessageType('error');
        setLoggingOut(false);
        return;
      }

      router.replace('/auth/login');
      router.refresh();
    } catch {
      setMessage('Unable to log out because the server could not be reached.');
      setMessageType('error');
      setLoggingOut(false);
    }
  }

  async function handleDeleteAccount() {
    if (!currentPassword) {
      setMessage('Enter your current password before deleting your account.');
      setMessageType('error');
      return;
    }

    setShowDeleteWarning(false);

    setDeleting(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword }),
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
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href={`/u/${userId}`} className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 font-semibold text-green-800 transition hover:bg-green-50">
              ← Back to home
            </Link>
            <p className="mt-5 text-sm font-semibold tracking-wide text-[#28784F]">
              OMM SAI KRISHNA
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#174D35]">
              My Account
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#52715D]">
              Manage your username, password, and account access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutWarning(true)}
            disabled={loggingOut || deleting}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#176B45] px-4 py-2 text-sm font-semibold text-[#176B45] transition hover:bg-[#E8F2E8] disabled:opacity-60"
          >
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </header>

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

        <section className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#174D35]">Account details</h2>
            <p className="mt-1 text-sm text-[#52715D]">
              Signed in as <span className="font-semibold">{currentUsername || 'User'}</span>
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-semibold text-[#174D35]">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
              />
              <p className="mt-1 text-xs text-[#718675]">
                Use 3–30 lowercase letters, numbers, or underscores.
              </p>
            </div>

            <div className="border-t border-[#E4ECE3] pt-5">
              <h3 className="font-semibold text-[#174D35]">Change password</h3>
              <p className="mt-1 text-sm text-[#52715D]">
                Leave the new password fields empty if you only want to change your username.
              </p>
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-[#174D35]">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#174D35]">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your new password"
                className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
              />
            </div>

            <div>
              <label htmlFor="currentPassword" className="mb-2 block text-sm font-semibold text-[#174D35]">
                Current password <span className="text-red-600">*</span>
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Required to save or delete changes"
                className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
              />
            </div>

            <button
              type="submit"
              disabled={saving || deleting || loggingOut}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#176B45] px-5 py-3 font-semibold text-white transition hover:bg-[#174D35] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? 'Saving changes...' : 'Save account changes'}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-red-700">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-[#52715D]">
            This permanently deletes your user account. You must enter your current password
            above and confirm the action. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteWarning(true)}
            disabled={deleting || saving || loggingOut}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? 'Deleting account...' : 'Delete my account'}
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
        message="Permanently delete your account? This action cannot be undone."
        confirmText="Delete account"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteWarning(false)}
        loading={deleting}
      />
    </main>
  );
}
