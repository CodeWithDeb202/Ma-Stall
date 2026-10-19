import Overview from "@/components/dashboard/Overview";
import DashboardLayout from "@/components/layout/DashboardLayout";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await verifySession();

  return (
    <DashboardLayout>
      <Overview />
    </DashboardLayout>
  );
}
