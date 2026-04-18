/**
 * Нормалізація елемента списку друзів для кліків (аватар, ім’я, іконка).
 * Підтримує плоскі об’єкти та вкладені user / followedUser / follower.
 */
export function normalizeFriendListItem(f) {
  const base = f?.user ?? f?.followedUser ?? f?.follower ?? f;
  if (!base || typeof base !== "object") return null;
  return {
    id: base.id ?? base._id ?? f?.id ?? f?._id ?? f,
    username:
      base.username ??
      base.userName ??
      base.nick ??
      base.nickname ??
      base.login ??
      base.slug ??
      base.handle ??
      null,
    firstName: base.firstName ?? base.first_name,
    lastName: base.lastName ?? base.last_name,
    avatar: base.avatarUrl ?? base.avatar ?? null,
    online: base.online !== false,
    isFollowingMe: base.isFollowingMe === true,
    amIFollowing: base.amIFollowing === true,
    isFriend: base.isFriend === true,
    isVip: base.isVip === true,
  };
}

/**
 * Сегмент URL /profile/:handle для будь-якого DTO користувача (пошук, стрічка, список друзів).
 */
export function getProfileRouteHandle(u) {
  if (!u) return null;
  const raw =
    u.username ??
    u.userName ??
    u.nick ??
    u.nickname ??
    u.login ??
    u.slug ??
    u.handle ??
    null;
  if (!raw) return null;
  return String(raw).trim().replace(/^@/, "") || null;
}

/** Як getProfileRouteHandle, але для елементів сітки друзів (без плейсхолдерів). */
export function getFriendRouteHandle(f) {
  if (!f || String(f.id).startsWith("placeholder-")) return null;
  return getProfileRouteHandle(f);
}

export function getFriendDisplayLabel(f) {
  const name = [f?.firstName, f?.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  const h = getFriendRouteHandle(f);
  return h ? `@${h}` : "";
}
