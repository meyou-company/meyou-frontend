import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const SESSION_ACCESS_KEY = "meyou_session_access_token";
const SESSION_REFRESH_KEY = "meyou_session_refresh_token";

/** Bearer для cross-origin або dev (порт фронту ≠ API), доповнює httpOnly cookies після OAuth. */
export function persistOAuthSessionTokens(accessToken, refreshToken) {
  try {
    if (accessToken) sessionStorage.setItem(SESSION_ACCESS_KEY, accessToken);
    if (refreshToken) sessionStorage.setItem(SESSION_REFRESH_KEY, refreshToken);
  } catch (_) {
    /* ignore */
  }
}

export function clearOAuthSessionTokens() {
  try {
    sessionStorage.removeItem(SESSION_ACCESS_KEY);
    sessionStorage.removeItem(SESSION_REFRESH_KEY);
  } catch (_) {
    /* ignore */
  }
}

function readSessionAccess() {
  try {
    return sessionStorage.getItem(SESSION_ACCESS_KEY);
  } catch {
    return null;
  }
}

function readSessionRefresh() {
  try {
    return sessionStorage.getItem(SESSION_REFRESH_KEY);
  } catch {
    return null;
  }
}

function persistTokensFromResponseBody(data) {
  if (!data || typeof data !== "object") return;
  const access = data.accessToken ?? data.access_token;
  const refresh = data.refreshToken ?? data.refresh_token;
  persistOAuthSessionTokens(access, refresh);
}

/**
 * Одразу при завантаженні бандлу: забрати токени з query до React useEffect —
 * щоб паралельний init() уже міг зробити /users/me з Authorization.
 */
function bootstrapOAuthQueryTokens() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path !== "/auth/google/success") return;
  const q = window.location.search;
  if (!q) return;
  const params = new URLSearchParams(q);
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  if (!access && !refresh) return;
  persistOAuthSessionTokens(access ?? undefined, refresh ?? undefined);
}

bootstrapOAuthQueryTokens();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

const isRefreshEndpoint = (config) => {
  const url = config?.url ?? "";
  const base = config?.baseURL ?? "";
  return (
    String(url).includes("/auth/refresh") ||
    String(base).includes("/auth/refresh")
  );
};

api.interceptors.request.use((config) => {
  if (config.headers?.Authorization) return config;

  if (isRefreshEndpoint(config)) {
    const rt = readSessionRefresh();
    if (rt) {
      config.headers.Authorization = `Bearer ${rt}`;
    }
  } else {
    const at = readSessionAccess();
    if (at) {
      config.headers.Authorization = `Bearer ${at}`;
    }
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
  (res) => {
    const url = res.config?.url ?? "";
    if (String(url).includes("/auth/refresh") && res.config?.method === "post") {
      persistTokensFromResponseBody(res.data);
    }
    return res;
  },
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
            resolve: () => resolve(api(original)),
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshRes = await api.post("/auth/refresh", null, {
          skipAuth: true,
        });
        persistTokensFromResponseBody(refreshRes?.data);
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

/** @deprecated порожній заглушок; Bearer береться з sessionStorage або cookies */
export const setAccessToken = () => {};
