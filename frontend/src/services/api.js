const serverUrl = process.env.BACKEND_URL;

const backendUrl = serverUrl || "https://ma-stall.onrender.com";

// Browser requests use same-origin Next.js API routes.
// Server-side requests use the private backend URL.
const apiUrl = typeof window !== "undefined" ? "" : backendUrl;

export default apiUrl;
