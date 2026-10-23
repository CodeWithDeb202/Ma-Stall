
import verifySession from "@/lib/verify-session";
import MenuItemDetails from "@/components/dashboard/MenuItemDetails";

export const dynamic = "force-dynamic";

export default async function AdminMenuItemDetailsPage({ params }) {
  await verifySession(["admin"]);
  const { itemId } = await params;

  return (
    <MenuItemDetails
      itemId={itemId}
      isAdmin
      backHref="/admin/dashboard/menu-items"
    />
  );
}