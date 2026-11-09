import verifySession from "@/lib/verify-session";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Membership from "@/components/dashboard/Membership";

export const dynamic = "force-dynamic";

export default async function MembershipPage({ params }) {
  const { userId } = await params;
  await verifySession(['user'], userId);

  return (
    <DashboardLayout>
      <Membership />
    </DashboardLayout>
  );
}
