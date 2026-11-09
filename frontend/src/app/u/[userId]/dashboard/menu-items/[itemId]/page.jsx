import verifySession from "@/lib/verify-session";
import MenuItemDetails from "@/components/dashboard/MenuItemDetails";

export const dynamic = "force-dynamic";

export default async function UserPublicMenuItemPage({ params }) {
  const { userId, itemId } = await params;
  const nextPath = `/u/${userId}/dashboard/menu-items/${itemId}`;
  const sessionData = await verifySession(
    ['user'],
    userId,
    `/auth/login?next=${encodeURIComponent(nextPath)}`
  );

  return (
    <MenuItemDetails
      itemId={itemId}
      isPublic
      backHref="/"
    />
  );
}
