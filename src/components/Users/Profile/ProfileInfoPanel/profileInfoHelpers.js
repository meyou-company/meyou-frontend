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
