const ICLOUD_DOMAINS = new Set(['icloud.com', 'me.com', 'mac.com']);

export function isIcloudMailbox(email) {
  const trimmed = String(email || '')
    .trim()
    .toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return false;
  return ICLOUD_DOMAINS.has(trimmed.slice(at + 1));
}
