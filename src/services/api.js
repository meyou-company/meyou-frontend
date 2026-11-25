import axios from "axios";
import { captureApiServerError } from "../monitoring/sentry.js";
import { pathWithoutQuery } from "../monitoring/sentry-sanitize.js";
import { logApiError, logApiRequest, logApiResponse } from "../utils/apiRequestLog";
import {
  dedupedSessionRefresh,
  withRefreshParallelRetry,
} from "./sessionRefresh";
import {
  clearStoredSessionId,
  getClientDeviceId,
  getStoredSessionId,
  persistSessionId,
} from "../utils/clientDeviceId";

/**
 * `VITE_API_URL` задає базу під глобальний префікс `/api` на Nest.
 * Prod (рекомендовано): абсолютний URL https://api.lunmeyo.com/api — запити напряму на API (CORS + credentials).
 * Альтернатива: порожньо або `/api` — тоді на Vercel спрацює rewrite з vercel.json на api.lunmeyo.com.
 */
function resolveApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (raw) {
    const absolute = /^https?:\/\//i.test(raw);
    if (absolute && import.meta.env.DEV) {
      try {
        const origin = new URL(raw).origin;
        const pageOrigin =
          typeof window !== "undefined" ? window.location.origin : "";
        if (pageOrigin && origin !== pageOrigin) {
          console.warn(
            `[meyou-frontend] VITE_API_URL points to ${origin} while dev runs on ${pageOrigin}. ` +
              "Use VITE_API_URL=/api (see .env.development) so Vite proxies to api.lunmeyo.com and avoids CORS.",
          );
        }
      } catch {
        /* ignore parse errors */
      }
    }
    if (!absolute && import.meta.env.PROD) {
      console.warn(
        `[meyou-frontend] VITE_API_URL is relative (${raw}). With Vercel, vercel.json must rewrite /api → API host. Recommended: absolute https://api.lunmeyo.com/api`,
      );
    }
    return raw;
  }
  if (import.meta.env.DEV) {
    return "/api";
  }
  console.error(
    "[meyou-frontend] VITE_API_URL is unset in production. Defaulting to /api — ensure vercel.json proxies /api to api.lunmeyo.com.",
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
export const AUTH_ACCESS_TOKEN_UPDATED_EVENT = "meyou:access-token-updated";

/**
 * Persist access JWT for Bearer + Socket.IO (cross-origin).
 * Refresh JWT stays in httpOnly cookie only (SEC-003).
 */
export function persistOAuthSessionTokens(accessToken, _ignoredRefresh) {
  void _ignoredRefresh;
  try {
    sessionStorage.removeItem(SESSION_REFRESH_KEY);
    const previousAccessToken = sessionStorage.getItem(SESSION_ACCESS_KEY);
    if (accessToken) sessionStorage.setItem(SESSION_ACCESS_KEY, accessToken);
    if (
      accessToken &&
      accessToken !== previousAccessToken &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent(AUTH_ACCESS_TOKEN_UPDATED_EVENT, {
        detail: { accessToken },
      }));
    }
  } catch (_) {
    /* ignore */
  }
}

export function clearOAuthSessionTokens() {
  try {
    sessionStorage.removeItem(SESSION_ACCESS_KEY);
    sessionStorage.removeItem(SESSION_REFRESH_KEY);
    clearStoredSessionId();
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
  persistOAuthSessionTokens(access);
}

function stripLegacyRefreshFromSessionStorage() {
  try {
    sessionStorage.removeItem(SESSION_REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

stripLegacyRefreshFromSessionStorage();

export const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  withCredentials: true,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 25000,
});

/** Credentialed session refresh with dedupe + REFRESH_PARALLEL retries (SEC-004). */
export function postSessionRefresh() {
  return dedupedSessionRefresh(() =>
    withRefreshParallelRetry(() =>
      api.post("/auth/refresh", null, { skipAuth: true }),
    ),
  );
}

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
  const headers = config.headers ?? {};
  headers["X-Lunmeyo-Device-Id"] = getClientDeviceId();
  const sid = getStoredSessionId();
  if (sid) {
    headers["X-Lunmeyo-Session-Id"] = sid;
  }
  config.headers = headers;

  if (!config.headers?.Authorization) {
    if (!isRefreshEndpoint(config)) {
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
        String(url).includes('/auth/login') ||
        String(url).includes('/auth/register') ||
        String(url).includes('/auth/oauth/exchange')) &&
      res.config?.method === 'post'
    ) {
      persistTokensFromResponseBody(res.data);
      if (res.data?.sessionId) {
        persistSessionId(res.data.sessionId);
      }
    }
    return res;
  },
  async (err) => {
    logApiError(err.config?.__apiLogId, err);
    const status = err.response?.status;
    if (status >= 500) {
      const url = [err.config?.baseURL, err.config?.url]
        .filter(Boolean)
        .join("")
        .replace(/([^:]\/)\/+/g, "$1");
      captureApiServerError({
        status,
        code: err.response?.data?.code,
        method: String(err.config?.method ?? "get").toUpperCase(),
        urlPath: pathWithoutQuery(url),
      });
    }
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
        const refreshRes = await postSessionRefresh();
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
