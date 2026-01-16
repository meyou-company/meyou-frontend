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

// ✅ 1) Тут додаємо skipAuth
api.interceptors.request.use((config) => {
  // якщо запит "публічний" — не додаємо Authorization
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

    // ✅ 2) якщо це skipAuth — НЕ робимо refresh і не ретраїмо
    if (original?.skipAuth) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              // якщо вдруг раптом skipAuth — не ставимо Authorization
              if (!original.skipAuth) {
                original.headers = original.headers ?? {};
                original.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh");
        const newToken = data?.accessToken;

        if (newToken) setAccessToken(newToken);

        resolveQueue(null, newToken);

        if (!original.skipAuth) {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
        }

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
