const testing = false;
const serverUrl = process.env.NEXT_PUBLIC_API_URL;
const apiUrl = testing ? "http://localhost:5000" : serverUrl ? serverUrl : "https://ma-stall.onrender.com";

export default apiUrl;