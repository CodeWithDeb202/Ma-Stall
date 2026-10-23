import MenuItemDetails from "@/components/dashboard/MenuItemDetails";

export const dynamic = "force-dynamic";

export default async function PublicMenuItemDetailsPage({ params }) {
  const { itemId } = await params;

  return (
    <MenuItemDetails
      itemId={itemId}
      isPublic
      backHref="/"
    />
  );
}
