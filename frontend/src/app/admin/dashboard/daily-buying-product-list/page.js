import DailyBuyingProductList from "@/components/dashboard/DailyBuyingProductList";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function DailyBuyingProductListPage() {
  await verifySession();
  return <DailyBuyingProductList />;
}
