import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, 
});

let accessToken = localStorage.getItem("accessToken");

export const setAccessToken = (token) => {
  accessToken = token;
  if (token) localStorage.setItem("accessToken", token);
  else localStorage.removeItem("accessToken");
};

// ✅ додаємо Authorization тільки якщо НЕ skipAuth
api.interceptors.request.use((config) => {
  if (!config.skipAuth && accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let queue = [];

const resolveQueue = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

const isRefreshEndpoint = (config) => {
  const url = config?.url ?? config?.baseURL ?? "";
  return String(url).includes("/auth/refresh");
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // ✅ не retry refresh — якщо це refresh request або skipAuth
    if (original?.skipAuth || isRefreshEndpoint(original)) {
      if (isRefreshEndpoint(original)) setAccessToken(null);
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              if (token) {
                original.headers = original.headers ?? {};
                original.headers.Authorization = `Bearer ${token}`;
                resolve(api(original));
              } else {
                reject(new Error("Session expired"));
              }
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh", null, {
          skipAuth: true,
        });
        const newToken = data?.accessToken;
        if (newToken) setAccessToken(newToken);
        resolveQueue(null, newToken);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        setAccessToken(null);
        resolveQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);
