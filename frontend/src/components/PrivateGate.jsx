'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrivateGate() {
  const [secretCode, setSecretCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  async function verifyAccess(value) {
    if (!value.trim() || isChecking) return;

    setIsChecking(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ secretCode: value }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        router.replace('/dashboard');
      }
    } catch {
      // Backend connection will be configured next.
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FBF7] px-5">
      <section className="w-full max-w-sm">
        <h1 className="mb-10 text-center text-2xl font-semibold tracking-tight text-[#174D35] sm:text-3xl">
          This is Private Website
        </h1>

        <input
          aria-label="Secret code"
          type="password"
          autoComplete="off"
          value={secretCode}
          onChange={(event) => {
            const value = event.target.value;
            setSecretCode(value);

            if (value.trim()) {
              verifyAccess(value);
            }
          }}
          placeholder=" "
          className="h-12 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 text-[#174D35] outline-none transition focus:border-[#28784F] focus:ring-2 focus:ring-[#28784F]/15"
        />
      </section>
    </main>
  );
}
