const ENABLED =
  import.meta.env.DEV || String(import.meta.env.VITE_API_DEBUG ?? '').toLowerCase() === 'true';

let seq = 0;

export function logApiRequest(config) {
  if (!ENABLED) return null;
  const id = ++seq;
  const method = (config.method || 'get').toUpperCase();
  const url = [config.baseURL, config.url]
    .filter(Boolean)
    .join('')
    .replace(/([^:]\/)\/+/g, '$1');
  console.log(`[api] → #${id} ${method} ${url}`);
  return id;
}

export function logApiResponse(id, response) {
  if (!ENABLED || id == null) return;
  const status = response?.status ?? '?';
  console.log(`[api] ← #${id} ${status}`);
}

function isExpectedGuestAuthError(error) {
  const status = error?.response?.status;
  if (status !== 401) return false;
  const url = [error.config?.baseURL, error.config?.url]
    .filter(Boolean)
    .join('')
    .replace(/([^:]\/)\/+/g, '$1');
  return url.includes('/users/me') || url.includes('/auth/refresh');
}

export function logApiError(id, error) {
  if (!ENABLED || id == null) return;
  if (isExpectedGuestAuthError(error)) return;
  const status = error?.response?.status ?? 'ERR';
  console.warn(`[api] ✕ #${id} ${status}`, error?.message);
}
