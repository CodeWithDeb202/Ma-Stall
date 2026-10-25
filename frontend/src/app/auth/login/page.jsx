'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername) || !password || password.length > 128) {
      setMessage('Enter a valid username and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedUsername, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || data.user?.role !== 'user') {
        setMessage(data.message || 'Login failed. Please try again.');
        return;
      }

      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
      const session = await sessionResponse.json().catch(() => ({}));

      if (
        !sessionResponse.ok ||
        session?.success !== true ||
        session?.authenticated !== true ||
        session?.role !== 'user' ||
        !session?.userId
      ) {
        setMessage('Login succeeded, but your user session could not be verified.');
        return;
      }

      const userHome = `/u/${session.userId}`;
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext =
        next && /^\/menu-items\/[a-f\d]{24}$/i.test(next)
          ? `/u/${session.userId}/dashboard${next}`
          : userHome;

      router.replace(safeNext);
      router.refresh();
    } catch {
      setMessage('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FBF7] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#D8E5D8] bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 font-semibold text-green-800 transition hover:bg-green-50">
          ← Back to home
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold text-[#28784F]">OMM SAI SHRI KRISHNA</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#174D35]">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#52715D]">
            Log in to your user account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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
              placeholder="Enter your username"
              className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition placeholder:text-[#829587] focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#174D35]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="min-h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#173D2B] outline-none transition placeholder:text-[#829587] focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/15"
            />
          </div>

          {message && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#176B45] px-5 py-3 font-semibold text-white transition hover:bg-[#174D35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#52715D]">
          Don’t have an account?{' '}
          <Link href="/auth/register" className="font-semibold text-[#176B45] hover:underline">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
