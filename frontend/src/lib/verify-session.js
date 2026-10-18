
import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import apiUrl from "@/services/api";

export default async function verifySession() {
  const requestId = crypto.randomUUID();


  const cookieStore = await cookies();
  const session = cookieStore.get("ma_stall_session")?.value;


  if (!session) {
    redirect("/");
  }

  try {
    const response = await axios.get(
      `${apiUrl}/api/auth/session`,
      {
        headers: {
          Cookie: `ma_stall_session=${session}`,
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    );


    if (response.status !== 200) {

      redirect("/");
    }

    return true;
  } catch (error) {
    if (error.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error(`[AUTH:${requestId}] Backend session request failed`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      backendUrl: apiUrl,
    });

    redirect("/");
  }
}
