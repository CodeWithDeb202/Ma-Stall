
const testing = false;
const serverUrl = process.env.NEXT_PUBLIC_API_URL;
const backendUrl = testing ? "http://localhost:5000" : serverUrl || "https://ma-stall.onrender.com";

// Browser requests use same-origin Next.js API routes.
// Server-side authentication checks call the backend directly.
const apiUrl = typeof window !== "undefined" ? "" : backendUrl;

export default apiUrl;
