import { toast } from "react-toastify";

export const showSuccess = (message) => toast.success(message);
export const showError = (message) => toast.error(message);
export const showWarning = (message) => toast.warning(message);
export const showInfo = (message) => toast.info(message);

export function getErrorMessage(error, fallback = "Operation failed. Please try again.") {
  if (!error) return fallback;

  const status = error.response?.status;
  const serverMessage =
    error.response?.data?.message ||
    error.response?.data?.error;

  if (serverMessage && typeof serverMessage === "string") {
    return serverMessage;
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "Request timed out. Please try again.";
  }

  if (
    error.code === "ERR_NETWORK" ||
    error.message === "Network Error" ||
    (!error.response && error.request)
  ) {
    return "Cannot connect to the server. Check your internet or server connection.";
  }

  if (status === 400) return "Invalid details. Please check your input.";
  if (status === 401) return "Your session may have expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested record or endpoint was not found.";
  if (status >= 500) return "Server error. Please try again later.";

  return fallback;
}
