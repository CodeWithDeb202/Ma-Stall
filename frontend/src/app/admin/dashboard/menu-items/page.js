import MenuItems from "@/components/dashboard/MenuItems";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function MenuItemsPage() {
  await verifySession(['admin', 'user']);
  return <MenuItems />;
}
