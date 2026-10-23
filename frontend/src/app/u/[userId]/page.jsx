import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import axios from "axios";
import apiUrl from "@/services/api";

export const dynamic = "force-dynamic";

export default async function UserHomePage({ params }) {
  const { userId } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("ma_stall_session")?.value;

  if (!session) redirect("/auth/login");

  try {
    const response = await axios.get(`${apiUrl}/api/auth/session`, {
      headers: { Cookie: `ma_stall_session=${session}` },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (
      response.status !== 200 ||
      response.data?.success !== true ||
      response.data?.role !== "user" ||
      String(response.data?.userId) !== String(userId)
    ) {
      redirect("/");
    }
  } catch (error) {
    if (error?.message === "NEXT_REDIRECT") throw error;
    redirect("/");
  }

  redirect(`/u/${userId}/dashboard/menu-items`);
}
