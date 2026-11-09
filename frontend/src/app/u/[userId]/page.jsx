import { redirect } from "next/navigation";
import verifySession from "@/lib/verify-session";

export const dynamic = "force-dynamic";

export default async function UserHomePage({ params }) {
  const { userId } = await params;
  const session = await verifySession(['user'], userId);
  redirect(`/u/${session.userId}/dashboard/menu-items`);
}
