export function detectBrowserName() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  const lower = ua.toLowerCase();
  if (lower.includes('edg/')) return 'Edge';
  if (lower.includes('chrome/') && !lower.includes('chromium')) return 'Chrome';
  if (lower.includes('firefox/')) return 'Firefox';
  if (lower.includes('safari/') && !lower.includes('chrome')) return 'Safari';
  if (lower.includes('opr/') || lower.includes('opera')) return 'Opera';
  return 'unknown';
}

export function detectDeviceType() {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function getAppRelease() {
  return String(import.meta.env.VITE_APP_RELEASE ?? '').trim() || 'dev';
}