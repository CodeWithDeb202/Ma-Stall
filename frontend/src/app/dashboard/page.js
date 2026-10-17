import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard/Dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('ma_stall_session')?.value;

  if (!session) {
    redirect('/');
  }

  const apiUrl =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000';

  try {
    const response = await fetch(`${apiUrl}/api/auth/session`, {
      headers: { Cookie: `ma_stall_session=${session}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      redirect('/');
    }
  } catch (error) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
    redirect('/');
  }

  return <Dashboard />;
}
