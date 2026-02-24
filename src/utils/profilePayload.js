import { normalizePhone } from "./normalizePhone";

/** Перевірка формату YYYY-MM-DD та віку 18–100 */
export function isValidBirthDate(s) {
  if (!s || typeof s !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  const age = new Date().getFullYear() - y;
  if (new Date() < new Date(y + age, m - 1, d)) return age >= 18 && age <= 100;
  return age >= 18 && age <= 100;
}

export function normalizeForValidation(v) {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    phone: normalizePhone(v.phone),
    nationality: v.nationality,
    username: v.username,
    bio: v.bio,
    interests: Array.isArray(v.interests) ? v.interests.map((x) => x.value) : [],
    hobbies: Array.isArray(v.hobbies) ? v.hobbies.map((x) => x.value) : [],
    maritalStatus: v.maritalStatus?.value || "",
    country: v.country?.value || "",
    city: v.city?.value || "",
    gender: v.gender,
    birthDate: v.birthDate,
  };
}
function toYMDLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function toBackendPayload(v) {
  const birthDate =
    v.birthDate && typeof v.birthDate === "string" && v.birthDate.trim()
      ? v.birthDate.trim()
      : undefined;

  const payload = {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    phone: normalizePhone(v.phone),
    nationality: v.nationality.trim(),

    country: v.country?.value || undefined,
    city: v.city?.value || undefined,

    maritalStatus: v.maritalStatus?.value || undefined,
    bio: v.bio?.trim() || undefined,

    gender: v.gender === "MALE" || v.gender === "FEMALE" ? v.gender : undefined,

    // ✅ головний фікс:
    birthDate: birthDate ? `${birthDate}T12:00:00.000Z` : undefined,
  };

  const username = v.username?.trim();
  if (username) payload.username = username;

  const interests = Array.isArray(v.interests) ? v.interests.map((x) => x.value) : [];
  payload.interests = interests;

  const hobbies = Array.isArray(v.hobbies) ? v.hobbies.map((x) => x.value) : [];
  if (hobbies.length) payload.hobbies = hobbies;

  return payload;
}
