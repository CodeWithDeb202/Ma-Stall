'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setSuccess(false);

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      setMessage('Username must be 3–30 characters using letters, numbers, or underscores.');
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setMessage('Password must be between 8 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bridge/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(true);
      setMessage(data.message || 'Registration successful. You can now log in.');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    } catch {
      setMessage('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FBF7] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#D8E5D8] bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 font-semibold text-green-800 transition hover:bg-green-50"
        >
          ← Back to home
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold text-[#28784F]">OMM SAI SHRI KRISHNA</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#174D35]">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#52715D]">
            Register to manage your daily investment and income records.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-semibold text-[#174D35]"
            >
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
              pattern="[a-zA-Z0-9_]{3,30}"
              title="Use 3–30 letters, numbers, or underscores."
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
              className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition placeholder:text-[#829587] focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
            />
            <p className="mt-1.5 text-xs text-[#52715D]">
              Use 3–30 letters, numbers, or underscores.
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-[#174D35]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a strong password"
              className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition placeholder:text-[#829587] focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-[#174D35]"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
              className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition placeholder:text-[#829587] focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
            />
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`rounded-lg px-3 py-2.5 text-sm ${
                success
                  ? 'border border-[#B8DCC3] bg-[#E8F2E8] text-[#174D35]'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#176B45] px-5 py-3 font-semibold text-white transition hover:bg-[#174D35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#52715D]">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-[#176B45] hover:underline"
          >
            User login
          </Link>
        </p>
      </section>
    </main>
  );
}