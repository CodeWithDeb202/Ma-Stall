import verifySession from '@/lib/verify-session';
import LandingNavbar from '@/components/layout/LandingNavbar';
import Footer from '@/components/layout/Footer';
import BackButton from '@/components/reusable/BackButton';
import NotificationInbox from '@/components/dashboard/NotificationInbox';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({ params }) {
  const { userId } = await params;
  await verifySession(['user'], userId);

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

          <NotificationInbox />
        </div>
      </main>

      <Footer />
    </div>
  );
}
