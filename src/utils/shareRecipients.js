import { normalizeFriendsApiResponse } from "./profileFriends";

function pickUrl(u) {
  return u?.avatarUrl ?? u?.avatar ?? u?.profileImage ?? null;
}

/** Нормалізує користувача для вибору отримувача в SharePostModal. */
export function normalizeShareRecipient(raw) {
  if (!raw || typeof raw !== "object") return null;
  const u = raw.user ?? raw.followedUser ?? raw.follower ?? raw;
  const id = u.id ?? u._id ?? u.userId;
  if (id == null) return null;
  return {
    id: String(id),
    username: u.username ?? u.userName ?? u.nick ?? u.nickname ?? u.login ?? "",
    firstName: u.firstName ?? u.first_name ?? "",
    lastName: u.lastName ?? u.last_name ?? "",
    avatarUrl: pickUrl(u),
  };
}

export function normalizeShareRecipientList(list) {
  if (!Array.isArray(list)) return [];
  const byId = new Map();
  list.forEach((item) => {
    const n = normalizeShareRecipient(item);
    if (n?.id) byId.set(n.id, n);
  });
  return [...byId.values()];
}

export function extractUsersFromSearchResponse(res) {
  const payload = res?.data ?? res;
  const list = Array.isArray(payload) ? payload : payload?.users ?? [];
  return normalizeShareRecipientList(list);
}

export function extractFollowingFromResponse(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return normalizeFriendsApiResponse(data);
  if (Array.isArray(data?.items)) {
    return normalizeFriendsApiResponse({ items: data.items });
  }
  return normalizeFriendsApiResponse(data);
}

export function recipientDisplayName(user) {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user?.username) return user.username;
  return "Користувач";
}
