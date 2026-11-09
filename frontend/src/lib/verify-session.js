
import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import apiUrl from "@/services/api";

export default async function verifySession(
  allowedRoles = ['admin'],
  expectedUserId = null,
  loginPath = null
) {
  const requestId = crypto.randomUUID();
  const cookieStore = await cookies();
  const session = cookieStore.get("ma_stall_session")?.value;

  const unauthenticatedPath =
    loginPath || (allowedRoles.includes('user') ? '/auth/login' : '/auth/admin/login');
  if (!session) {
    redirect(unauthenticatedPath);
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


    if (response.status === 401) {
      redirect(unauthenticatedPath);
    }

    if (response.status !== 200) {
      throw new Error(`Backend session request returned ${response.status}`);
    }

    const data = response.data;
    if (
      data?.success !== true ||
      data?.authenticated !== true ||
      !['admin', 'user'].includes(data.role)
    ) {
      redirect(unauthenticatedPath);
    }

    if (!allowedRoles.includes(data.role)) {
      redirect(data.role === 'admin' ? '/admin/dashboard' : `/u/${data.userId}`);
    }

    if (
      expectedUserId !== null &&
      data.role === 'user' &&
      String(data.userId) !== String(expectedUserId)
    ) {
      redirect(`/u/${data.userId}`);
    }

    return data;
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

    throw new Error('Unable to verify the current session.', { cause: error });
  }
}
