import { normalizePhone } from './profileFormUtils';

/** Перевірка формату YYYY-MM-DD та віку 18–100 */
export function isValidBirthDate(s) {
  if (!s || typeof s !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;

  const today = new Date();
  let age = today.getFullYear() - y;
  const birthdayThisYear = new Date(today.getFullYear(), m - 1, d);
  const hasBirthdayPassed = today >= birthdayThisYear;

  if (!hasBirthdayPassed) age--;

  return age >= 18 && age <= 100;
}

const MAX_INTERESTS = 10;
const MAX_HOBBIES = 10;

const mapSelectToStrings = (arr, max) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => (typeof x === 'string' ? x : x?.value))
    .filter(Boolean)
    .slice(0, max);

function cityValue(city) {
  if (typeof city === 'string') return city.trim();
  return city?.value?.trim() || '';
}

export function normalizeForValidation(v) {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    phone: normalizePhone(v.phone),

    nationality: v.nationality,
    username: v.username,
    bio: v.bio,
    about: v.about,

    profession: v.profession,

    languages: mapSelectToStrings(v.languages, 20),
    interests: mapSelectToStrings(v.interests, MAX_INTERESTS),
    hobbies: mapSelectToStrings(v.hobbies, MAX_HOBBIES),

    maritalStatus: v.maritalStatus?.value || '',
    country: v.country?.value || '',
    city: cityValue(v.city),
    region: v.region?.value || '',

    gender: v.gender,
    birthDate: v.birthDate,

    instagram: v.instagram,
    telegram: v.telegram,
    profileVisibility: v.profileVisibility || {},
  };
}

export function toEditProfilePayload(v) {
  const birthDate =
    v.birthDate && typeof v.birthDate === 'string' && v.birthDate.trim()
      ? v.birthDate.trim()
      : undefined;

  const interests = mapSelectToStrings(v.interests, MAX_INTERESTS);
  const hobbies = mapSelectToStrings(v.hobbies, MAX_HOBBIES);
  const languages = mapSelectToStrings(v.languages, 20);

  const payload = {
    firstName: v.firstName?.trim(),
    lastName: v.lastName?.trim(),

    birthDate: birthDate ? `${birthDate}T00:00:00.000Z` : undefined,
    phone: normalizePhone(v.phone),

    nationality: v.nationality?.trim(),

    country: v.country?.value || undefined,
    city: cityValue(v.city) || undefined,
    region: v.region?.value || undefined,

    maritalStatus: v.maritalStatus?.value || undefined,
    gender: v.gender || undefined,

    bio: v.bio?.trim() || undefined,
    about: v.about?.trim() || undefined,
    profession: v.profession?.trim() || undefined,

    instagram: v.instagram?.trim() || undefined,
    telegram: v.telegram?.trim() || undefined,
    interests,
    hobbies,
    languages,

    profileVisibility: v.profileVisibility || undefined,
  };

  if (v.username?.trim()) {
    payload.username = v.username.trim();
  }

  return payload;
}
export function toCompleteProfilePayload(v) {
  const birthDate =
    v.birthDate && typeof v.birthDate === 'string' && v.birthDate.trim()
      ? v.birthDate.trim()
      : undefined;

  const interests = mapSelectToStrings(v.interests, MAX_INTERESTS);
  const hobbies = mapSelectToStrings(v.hobbies, MAX_HOBBIES);

  const payload = {
    firstName: v.firstName?.trim(),
    lastName: v.lastName?.trim(),

    birthDate: birthDate ? `${birthDate}T00:00:00.000Z` : undefined,
    phone: normalizePhone(v.phone),

    nationality: v.nationality?.trim(),

    country: v.country?.value || undefined,
    city: cityValue(v.city) || undefined,

    maritalStatus: v.maritalStatus?.value || undefined,
    gender: v.gender || undefined,

    bio: v.bio?.trim() || undefined,

    interests,
    hobbies,
  };

  if (v.username?.trim()) {
    payload.username = v.username.trim();
  }

  return payload;
}
