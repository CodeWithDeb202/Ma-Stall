import MembershipPayments from '@/components/dashboard/MembershipPayments';
import verifySession from '@/lib/verify-session';

export const dynamic = 'force-dynamic';

export default async function MembershipPaymentsPage() {
  await verifySession();
  return <MembershipPayments />;
}
