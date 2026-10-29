import axios from "axios";

const api = axios.create({
  adapter: "fetch",
  baseURL: (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, ""),
});

api.interceptors.request.use(
  (config) => {
    // Upload progress needs native XMLHttpRequest; fetch streams are not supported by every webview.
    if (config.data instanceof FormData) config.adapter = "xhr";
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    ) {
      localStorage.removeItem("access_token");
      window.dispatchEvent(new Event("auth-expired"));
    }
    return Promise.reject(error);
  },
);
