import SellingProduct from "@/components/dashboard/SellingProduct";
import verifySession from "@/lib/verify-session";
export const dynamic = "force-dynamic";
export default async function SellingProductPage() {
  await verifySession();
  return <SellingProduct />;
}
