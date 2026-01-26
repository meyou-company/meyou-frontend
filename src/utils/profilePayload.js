import { normalizePhone } from "./normalizePhone";

export function normalizeForValidation(v) {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    phone: normalizePhone(v.phone),
    nationality: v.nationality,
    username: v.username,
    bio: v.bio,
    hobbies: Array.isArray(v.hobbies) ? v.hobbies.map((x) => x.value) : [],
    maritalStatus: v.maritalStatus?.value || "",
    country: v.country?.value || "",
    city: v.city?.value || "",
  };
}

export function toBackendPayload(v) {
  const payload = {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    phone: normalizePhone(v.phone),
    nationality: v.nationality.trim(),
    country: v.country?.value || "",
    city: v.city?.value || "",
    maritalStatus: v.maritalStatus?.value || undefined,
    bio: v.bio?.trim() || undefined,
  };

  const username = v.username?.trim();
  if (username) payload.username = username;

  const hobbies = Array.isArray(v.hobbies) ? v.hobbies.map((x) => x.value) : [];
  if (hobbies.length) payload.hobbies = hobbies;

  return payload;
}
