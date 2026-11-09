import Users from '@/components/dashboard/Users';
import verifySession from '@/lib/verify-session';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  await verifySession();
  return <Users />;
}
