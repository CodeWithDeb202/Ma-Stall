import StockProducts from "@/components/dashboard/StockProducts";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function StockProductsPage() {
  await verifySession();
  return <StockProducts />;
}
