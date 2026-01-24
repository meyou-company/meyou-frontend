// src/services/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // ✅ треба для cookie
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

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // ✅ якщо skipAuth — не refreshимо
    if (original?.skipAuth) return Promise.reject(err);

    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              original.headers = original.headers ?? {};
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        // ✅ ВАЖЛИВО: refresh БЕЗ body, бо бекенд бере refreshToken з COOKIE
        const { data } = await api.post("/auth/refresh", null, { skipAuth: true });

        const newToken = data?.accessToken;
        if (newToken) setAccessToken(newToken);

        resolveQueue(null, newToken);

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;

        return api(original);
      } catch (refreshErr) {
        resolveQueue(refreshErr, null);
        setAccessToken(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);
