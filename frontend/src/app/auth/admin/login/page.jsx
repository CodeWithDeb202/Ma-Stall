'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [secretCode, setSecretCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || 'Admin login failed. Please try again.');
        return;
      }

      router.replace('/admin/dashboard');
      router.refresh();
    } catch {
      setMessage('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FBF7] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#D8E5D8] bg-white p-8 shadow-sm">
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 font-semibold text-green-800 transition hover:bg-green-50">
          ← Back to Home
        </Link>

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#176B45]">
            Omm Sai Shri Krishna
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#174D35]">
            Admin Login
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your admin access code to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="secretCode" className="mb-2 block text-sm font-medium text-gray-700">
              Admin Access Code
            </label>
            <input
              id="secretCode"
              name="secretCode"
              type="password"
              value={secretCode}
              onChange={(event) => setSecretCode(event.target.value)}
              maxLength={200}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-[#D8E5D8] px-4 py-3 text-gray-900 outline-none transition focus:border-[#176B45] focus:ring-2 focus:ring-[#176B45]/20"
              placeholder="Enter access code"
            />
          </div>

          {message && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !secretCode.trim()}
            className="w-full rounded-lg bg-[#176B45] px-4 py-3 font-semibold text-white transition hover:bg-[#174D35] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Login as Admin'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Looking for user login?{' '}
          <Link href="/auth/login" className="font-semibold text-[#176B45] hover:underline">
            User Login
          </Link>
        </p>
      </section>
    </main>
  );
}
