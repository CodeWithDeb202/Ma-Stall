import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import apiUrl from "@/services/api";

export default async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("ma_stall_session")?.value;

  if (!session) {
    redirect("/");
  }

  try {
    await axios.get(`${apiUrl}/api/auth/session`, {
      headers: {
        Cookie: `ma_stall_session=${session}`,
      },
      timeout: 10000,
    });

    return true;
  } catch {
    redirect("/");
  }
}