import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Access token берется из cookie автоматически бэкендом
// Фронтенд не хранит токены в localStorage

api.interceptors.request.use((config) => {
  // Куки отправляются автоматически через withCredentials
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

    if (original?.skipAuth || isRefreshEndpoint(original)) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              resolve(api(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        await api.post("/auth/refresh", null, { skipAuth: true });
        resolveQueue(null, true);
        return api(original);
      } catch (refreshErr) {
        resolveQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// Legacy compatibility - ничего не делает, токены в куках
export const setAccessToken = () => {};
