const HOME_CACHE =
  'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

const DYNAMIC_CACHE =
  'public, max-age=60, s-maxage=60, stale-while-revalidate=120, must-revalidate';

const FALLBACK_CACHE = HOME_CACHE;

function isDynamicPreviewPath(pathname) {
  const path = String(pathname || '/').split('?')[0];
  return (
    /^\/profile\/[^/]+\/?$/i.test(path) ||
    /^\/post\/[^/]+\/?$/i.test(path) ||
    /^\/posts\/[^/]+\/?$/i.test(path)
  );
}

/** Align with API link-preview.cache.ts */
export function cacheControlForPreviewPath(pathname, { fallback = false } = {}) {
  if (fallback) return FALLBACK_CACHE;
  if (isDynamicPreviewPath(pathname)) return DYNAMIC_CACHE;
  return HOME_CACHE;
}