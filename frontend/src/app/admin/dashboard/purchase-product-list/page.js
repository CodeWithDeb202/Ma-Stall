import PurchaseProductList from "@/components/dashboard/PurchaseProductList";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function PurchaseProductListPage() {
  await verifySession();
  return <PurchaseProductList />;
}
