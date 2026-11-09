import { redirect } from 'next/navigation';
import axios from 'axios';
import { cookies } from 'next/headers';
import apiUrl from '@/services/api';
import LandingNavbar from '@/components/layout/LandingNavbar';
import Footer from '@/components/layout/Footer';
import BackButton from '@/components/reusable/BackButton';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({ params }) {
  const { userId } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get('ma_stall_session')?.value;

  if (!session) redirect('/');

  try {
    const response = await axios.get(`${apiUrl}/api/auth/session`, {
      headers: { Cookie: `ma_stall_session=${session}` },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (
      response.status !== 200 ||
      response.data?.success !== true ||
      response.data?.role !== 'user' ||
      String(response.data?.userId) !== String(userId)
    ) {
      redirect('/');
    }
  } catch (error) {
    if (error?.message === 'NEXT_REDIRECT') throw error;
    redirect('/');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FBF7] text-[#174D35]">
      <LandingNavbar showProfile />

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
          <BackButton href={`/u/${userId}`} />

          <header className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
              Stay Updated
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Notifications
            </h1>
            <p className="mt-2 text-sm text-[#52715D] sm:text-base">
              Stay informed with your latest updates and announcements.
            </p>
          </header>

          <section
            aria-label="Your notifications"
            className="flex flex-1 items-center justify-center rounded-2xl border border-[#D8E5D8] bg-white px-5 py-12 shadow-sm"
          >
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F3E9] text-[#176B45]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-semibold text-[#174D35]">
                No notifications yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#52715D]">
                You&apos;re all caught up! New notifications and updates will
                appear here.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
