'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const googleButtonRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleCredential(response) {
    setMessage('');
    setLoading(true);

    try {
      const googleResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const googleData = await googleResponse.json().catch(() => ({}));

      if (!googleResponse.ok || !googleData.success) {
        setMessage(googleData.message || 'Google sign-in failed. Please try again.');
        return;
      }

      const sessionResponse = await fetch('/api/auth/session-status', {
        method: 'GET',
        cache: 'no-store',
      });
      const sessionData = await sessionResponse.json().catch(() => ({}));

      if (!sessionResponse.ok || !sessionData.authenticated ||
          sessionData.role !== 'user' || !sessionData.userId) {
        setMessage('Google sign-in succeeded, but session verification failed. Please try again.');
        return;
      }

      router.replace(`/u/${sessionData.userId}`);
      router.refresh();
    } catch {
      setMessage('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function initializeGoogleSignIn() {
    if (!window.google?.accounts?.id || !googleButtonRef.current ||
        !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setGoogleReady(false);
      return;
    }

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      width: 350,
    });
    setGoogleReady(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FBF7] px-4 py-10">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={initializeGoogleSignIn}
        onError={() => setGoogleReady(false)}
      />

      <section className="w-full max-w-md rounded-2xl border border-[#D8E5D8] bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 font-semibold text-green-800 transition hover:bg-green-50">
          ← Back to home
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold text-[#28784F]">OMM SAI SHRI KRISHNA</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#174D35]">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-[#52715D]">Register to manage your daily investment and income records.</p>
        </div>

        <div className="mt-8 flex min-h-12 justify-center">
          <div
            ref={googleButtonRef}
            className={googleReady ? '' : 'hidden'}
          />
          {!googleReady && (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="flex min-h-12 w-full max-w-87.5 cursor-not-allowed items-center justify-center gap-3 rounded-md border border-[#DADCE0] bg-[#F8F9FA] px-4 text-sm font-medium text-[#80868B] opacity-50 shadow-sm"
            >
              <span className="text-xl font-bold">G</span>
              Continue with Google
            </button>
          )}
        </div>

        {message && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{message}</p>}

        <p className="mt-8 text-center text-sm text-[#52715D]">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-[#176B45] hover:underline">User login</Link>
        </p>

        <p className="mt-3 text-center text-sm text-[#52715D]">
          Are you an administrator?{' '}
          <Link href="/auth/admin/login" className="font-semibold text-[#176B45] hover:underline">Admin login</Link>
        </p>
      </section>
    </main>
  );
}
