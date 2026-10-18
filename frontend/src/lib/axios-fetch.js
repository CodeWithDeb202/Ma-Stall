import axios from "axios";

export default async function axiosFetch(url, options = {}) {
  const response = await axios({
    url,
    method: options.method || "GET",
    headers: options.headers || {},
    data: options.body,
    withCredentials: options.credentials === "include",
    timeout: 15000,
    validateStatus: () => true,
  });
  return {
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    json: async () => response.data,
    headers: { get(name) { const v = response.headers[String(name).toLowerCase()]; return Array.isArray(v) ? v[0] ?? null : v ?? null; } },
  };
}
