import axios from "axios";

/**
 * Shared Axios client for protected ERP API requests.
 *
 * The JWT is read from localStorage for every request so that
 * the latest logged-in token is automatically used.
 */
const apiClient = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("erp_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default apiClient;