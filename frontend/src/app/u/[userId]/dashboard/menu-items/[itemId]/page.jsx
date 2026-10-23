import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import axios from "axios";
import apiUrl from "@/services/api";
import MenuItemDetails from "@/components/dashboard/MenuItemDetails";

export const dynamic = "force-dynamic";

export default async function UserPublicMenuItemPage({ params }) {
  const { userId, itemId } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("ma_stall_session")?.value;

  if (!session) {
    redirect(`/auth/login?next=${encodeURIComponent(`/u/${userId}/dashboard/menu-items/${itemId}`)}`);
  }

  let sessionData;

  try {
    const response = await axios.get(`${apiUrl}/api/auth/session`, {
      headers: { Cookie: `ma_stall_session=${session}` },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status !== 200 || response.data?.role !== "user") {
      redirect(`/auth/login?next=${encodeURIComponent(`/u/${userId}/dashboard/menu-items/${itemId}`)}`);
    }

    sessionData = response.data;
  } catch (error) {
    if (error?.message === "NEXT_REDIRECT") throw error;
    redirect("/");
  }

  if (String(sessionData.userId) !== String(userId)) {
    redirect(`/u/${sessionData.userId}/dashboard/menu-items/${itemId}`);
  }

  return (
    <MenuItemDetails
      itemId={itemId}
      isPublic
      backHref="/"
    />
  );
}
