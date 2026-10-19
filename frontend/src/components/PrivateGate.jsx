
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function PrivateGate() {
  const [secretCode, setSecretCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const router = useRouter();

  useState(() => {
    // Session verification is performed below using the existing auth endpoint.
  });

  useEffect(() => {
    let active = true;

    axios.get("/api/auth/session", { withCredentials: true })
      .then((response) => {
        if (active && response.data?.authenticated) {
          setAlreadyLoggedIn(true);
        }
      })
      .catch(() => {
        // Not logged in: keep the original secret-code form.
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => { active = false; };
  }, []);

  function goToDashboard() {
    router.replace("/dashboard");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!secretCode.trim() || loading) return;

    setLoading(true);
    setError("");


    const requestId = crypto.randomUUID();


    try {

      const response = await axios.post(
        "/api/auth/verify",
        { secretCode },
        { withCredentials: true }
      );


      if (response.status === 200 && response.data?.success) {
        router.replace("/dashboard");
      } else {
        setError(response.data?.message || "Verification failed.");
      }
    } catch (error) {
      console.error(`[LOGIN:${requestId}] Verification request failed`, {
        message: error.message,
        status: error.response?.status,
        code: error.code,
        endpoint: "/api/auth/verify",
      });

      setError(
        error.response?.data?.message ||
        "Unable to connect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7faf7] px-4">
      {alreadyLoggedIn ? (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#174D35] text-center">This is Private Website</h1>
          <button type="button" onClick={goToDashboard} className="w-full rounded-xl bg-[#174D35] px-5 py-3 font-semibold text-white transition hover:bg-[#236747]">Navigate to Dashboard</button>
        </div>
      ) : (
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col items-center gap-6"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-[#174D35] text-center">
          This is Private Website
        </h1>

        <div className="w-full">
          <label htmlFor="secretCode" className="sr-only">
            Secret code
          </label>

          <div className="flex items-center w-full rounded-xl border border-[#174D35] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#174D35]/20">
            <input
              id="secretCode"
              type={showSecret ? "text" : "password"}
              value={secretCode}
              onChange={(event) => {
                setSecretCode(event.target.value);
                setError("");
              }}
              placeholder="Enter secret code"
              autoComplete="current-password"
              required
              className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-4 text-gray-900 outline-none"
            />

            <button
              type="button"
              onClick={() => setShowSecret((previous) => !previous)}
              aria-label={showSecret ? "Hide secret code" : "Show secret code"}
              title={showSecret ? "Hide secret code" : "Show secret code"}
              className="px-4 py-3 text-[#174D35] hover:text-[#26764f]"
            >
              {showSecret ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.9 5.2A11 11 0 0112 5c5 0 9 4 10 7a11.8 11.8 0 01-3 4.4" />
                  <path d="M6.2 6.2C3.9 7.5 2.5 9.6 2 12c1 3 5 7 10 7 1.1 0 2.1-.2 3-.5" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !secretCode.trim()}
          className="w-full rounded-xl bg-[#174D35] px-5 py-3 font-semibold text-white transition hover:bg-[#236747] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Submit"}
        </button>
      </form>
      )}
    </main>
  );
}