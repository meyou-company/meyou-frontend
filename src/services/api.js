import axios from "axios";
import { logApiError, logApiRequest, logApiResponse } from "../utils/apiRequestLog";

/**
 * `VITE_API_URL` задає базу під глобальний префікс `/api` на Nest.
 * Prod (рекомендовано): абсолютний URL https://meyou-api.onrender.com/api — запити напряму на Render (CORS + credentials).
 * Альтернатива: порожньо або `/api` — тоді на Vercel спрацює rewrite з vercel.json (той же хост під `/api/...`).
 */
function resolveApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (raw) {
    const absolute = /^https?:\/\//i.test(raw);
    if (!absolute && import.meta.env.PROD) {
      console.warn(
        `[meyou-frontend] VITE_API_URL is relative (${raw}). With Vercel, vercel.json must rewrite /api → API host. Recommended: absolute https://YOUR-API.onrender.com/api`,
      );
    }
    return raw;
  }
  if (import.meta.env.DEV) {
    return "/api";
  }
  console.error(
    "[meyou-frontend] VITE_API_URL is unset in production. Defaulting to /api — ensure vercel.json proxies /api to meyou-api on Render.",
  );
  return "/api";
}

/** Базова URL API (ті самі що axios `baseURL`) — для Google OAuth redirect тощо. */
export const resolvedApiBaseUrl = resolveApiBaseUrl();

/**
 * Шлях для axios відносно baseURL.
 * Якщо baseURL вже закінчується на /api — не додавати /api і не починати з "/" (інакше axios
 * підставить шлях від кореня домену без /api). Інакше — префікс api/.
 */
export function apiPath(path) {
  const stripped = String(path ?? "")
    .trim()
    .replace(/^\//, "")
    .replace(/^api\//, "");
  if (!stripped) return "";
  const base = String(resolvedApiBaseUrl).replace(/\/$/, "");
  const baseEndsWithApi = /\/api$/i.test(base);
  return baseEndsWithApi ? stripped : `api/${stripped}`;
}

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

export function clearSessionAccessToken() {
  try {
    sessionStorage.removeItem(SESSION_ACCESS_KEY);
  } catch (_) {
    /* ignore */
  }
}

export function getSessionAccessToken() {
  return readSessionAccess();
}

export function getSessionRefreshToken() {
  return readSessionRefresh();
}

/** Чи є JWT у sessionStorage (httpOnly cookies з JS не читаються). */
export function hasStoredAuthCredentials() {
  return Boolean(readSessionAccess() || readSessionRefresh());
}

export const AUTH_SESSION_CLEARED_EVENT = 'meyou:auth-session-cleared';

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
  if (path !== "/auth/google/success" && path !== "/auth/callback") return;
  const q = window.location.search;
  if (!q) return;
  const params = new URLSearchParams(q);
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  if (!access && !refresh) return;
  persistOAuthSessionTokens(access ?? undefined, refresh ?? undefined);
  if (typeof window !== 'undefined' && access) {
    window.dispatchEvent(
      new CustomEvent('meyou:oauth-access-token', { detail: { accessToken: access } }),
    );
  }
}

bootstrapOAuthQueryTokens();

export const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  withCredentials: true,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 25000,
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
  config.__apiLogId = logApiRequest(config);

  if (!config.headers?.Authorization) {
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
    logApiResponse(res.config?.__apiLogId, res);
    const url = res.config?.url ?? "";
    if (
      (String(url).includes('/auth/refresh') ||
        String(url).includes('/auth/login')) &&
      res.config?.method === 'post'
    ) {
      persistTokensFromResponseBody(res.data);
    }
    return res;
  },
  async (err) => {
    logApiError(err.config?.__apiLogId, err);
    const original = err.config;

    if (original?.skipAuth || isRefreshEndpoint(original)) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !original?._retry) {
      const url = String(original?.url ?? "");
      const isAuthSessionEndpoint =
        url.includes("/users/me") || url.includes("/auth/refresh");
      const hadBearer = Boolean(original?.headers?.Authorization);
      const hasRefresh = Boolean(readSessionRefresh());

      // Guest probes on /users/me or /auth/refresh: don't chain another refresh.
      if (isAuthSessionEndpoint && !hadBearer && !hasRefresh) {
        return Promise.reject(err);
      }

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
        clearOAuthSessionTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(AUTH_SESSION_CLEARED_EVENT));
        }
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
