import Dashboard from "@/components/dashboard/Dashboard";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await verifySession();
  return <Dashboard />;
}