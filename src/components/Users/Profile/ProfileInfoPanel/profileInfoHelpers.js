const DEFAULT_VISIBILITY = {
  about: true,
  interests: true,
  hobbies: true,
  languages: true,
  profession: true,
  maritalStatus: true,
  nationality: true,
  location: true,
  instagram: true,
  telegram: true,
  tiktok: true,
};

export function getProfileVisibility(user) {
  return { ...DEFAULT_VISIBILITY, ...(user?.profileVisibility || {}) };
}

/**
 * Normalize Telegram / Instagram / TikTok username or URL to an https profile link.
 * Returns null when empty / invalid.
 */
export function buildSocialProfileUrl(network, raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  const lower = value.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return value;
  }

  // Protocol-relative or host-only pastes (t.me/…, instagram.com/…)
  if (
    lower.startsWith('t.me/') ||
    lower.startsWith('telegram.me/') ||
    lower.startsWith('instagram.com/') ||
    lower.startsWith('www.instagram.com/') ||
    lower.startsWith('tiktok.com/') ||
    lower.startsWith('www.tiktok.com/')
  ) {
    return `https://${value.replace(/^\/\//, '')}`;
  }

  const username = value.replace(/^@+/, '').trim();
  if (!username) return null;

  switch (network) {
    case 'telegram':
      return `https://t.me/${username}`;
    case 'instagram':
      return `https://instagram.com/${username}`;
    case 'tiktok':
      return `https://tiktok.com/@${username}`;
    default:
      return null;
  }
}

export function formatLanguages(languages) {
  if (Array.isArray(languages)) return languages.filter(Boolean).join(', ');
  if (typeof languages === 'string' && languages.trim()) return languages.trim();
  return '';
}

export function parseLanguagesInput(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function getUserInterests(user) {
  if (Array.isArray(user?.interests)) return user.interests;
  if (typeof user?.interests === 'string' && user.interests.trim()) {
    return user.interests
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function getAboutText(user) {
  return user?.about?.trim() || user?.bio?.trim() || '';
}
