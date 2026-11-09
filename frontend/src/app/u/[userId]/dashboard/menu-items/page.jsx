import verifySession from "@/lib/verify-session";
import UserMenuItems from "@/components/dashboard/UserMenuItems";

export const dynamic = "force-dynamic";

export default async function UserMenuItemsPage({ params }) {
  const { userId } = await params;
  await verifySession(['user'], userId);

  return <UserMenuItems userId={userId} />;
}
