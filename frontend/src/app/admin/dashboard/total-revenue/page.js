import TotalRevenue from "@/components/dashboard/TotalRevenue";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function TotalRevenuePage() {
  await verifySession();
  return <TotalRevenue />;
}
