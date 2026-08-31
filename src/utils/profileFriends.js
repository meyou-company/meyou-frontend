/**
 * Повертає кількість друзів з friendsCount API.
 * Бекенд: { followers, following, total } або число.
 * Пріоритет: total (унікальні ACTIVE-зв’язки) → following (як сторінка «Друзі») → сума.
 * @param {number|{ followers?: number, following?: number, total?: number }|undefined} raw
 * @returns {number|undefined}
 */
export function getFriendsCountNumber(raw) {
  if (raw == null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === "object") {
    if (typeof raw.total === "number" && Number.isFinite(raw.total) && raw.total >= 0) {
      return raw.total;
    }
    if (
      typeof raw.following === "number" &&
      Number.isFinite(raw.following) &&
      raw.following >= 0
    ) {
      return raw.following;
    }
    const followers = raw.followers ?? raw.followers_count ?? 0;
    const following = raw.following ?? raw.following_count ?? 0;
    const sum = Number(followers) + Number(following);
    return Number.isFinite(sum) && sum >= 0 ? sum : undefined;
  }
  return undefined;
}

/**
 * Нормалізує відповідь API списку друзів/підписників у масив об'єктів.
 * Підтримує: масив напряму, { items: [] }, { followers: [] }, { data: [] }, елементи з _id, isFollowingMe, amIFollowing, isFriend, isVip.
 */
export function normalizeFriendsApiResponse(response) {
  const data = response?.data ?? response;
  if (!data || typeof data !== "object") return [];
  let list = Array.isArray(data)
    ? data
    : (data.items ?? data.data ?? data.results ?? data.list ?? data.followers ?? []);
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const u = item?.user ?? item?.followedUser ?? item?.follower ?? item;
    if (!u || typeof u !== "object") return null;
    return {
      id: u.id ?? u._id ?? u.userId ?? u.username,
      username:
        u.username ??
        u.userName ??
        u.nick ??
        u.nickname ??
        u.login ??
        u.slug ??
        u.handle ??
        null,
      firstName: u.firstName ?? u.first_name,
      lastName: u.lastName ?? u.last_name,
      avatarUrl: u.avatarUrl ?? u.avatar ?? u.avatar_url ?? u.profileImage,
      avatar: u.avatarUrl ?? u.avatar ?? u.avatar_url ?? u.profileImage,
      online: u.isOnline === true || u.online === true,
      isOnline: u.isOnline === true || u.online === true,
      lastSeenAt: u.lastSeenAt ?? null,
      isFollowingMe: Boolean(u.isFollowingMe),
      amIFollowing: Boolean(u.amIFollowing),
      isFriend: Boolean(u.isFriend),
      isVip: Boolean(u.isVip),
      vipEnabled: u.vipEnabled === true || u.vip_enabled === true,
    };
  }).filter(Boolean);
}

/**
 * Повертає нормалізований список друзів з об'єкта користувача (відповідь GET /users/:username).
 * Перевіряє: friends, following, followers, subscriptions, followList, userFollowing (якщо бекенд віддає під іншими ключами).
 */
export function getFriendsFromUser(u) {
  if (!u) return [];
  let list = Array.isArray(u.friends) ? u.friends : (u.friends?.items ?? []);
  if (list.length === 0) {
    const following = Array.isArray(u.following) ? u.following : (u.following?.items ?? []);
    const followers = Array.isArray(u.followers) ? u.followers : (u.followers?.items ?? []);
    const subscriptions = Array.isArray(u.subscriptions) ? u.subscriptions : (u.subscriptions?.items ?? []);
    const followList = Array.isArray(u.followList) ? u.followList : (u.followList?.items ?? []);
    const userFollowing = Array.isArray(u.userFollowing) ? u.userFollowing : (u.userFollowing?.items ?? []);
    const combined = [...following, ...followers, ...subscriptions, ...followList, ...userFollowing];
    if (combined.length > 0) {
      const seen = new Set();
      list = combined.filter((f) => {
        const raw = f?.user ?? f?.followedUser ?? f?.follower ?? f;
        const id = raw?.id ?? raw?._id ?? raw?.userId ?? raw?.username;
        if (id == null || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
  }
  return list.map((item) => {
    const f = item?.user ?? item?.followedUser ?? item?.follower ?? item;
    if (!f || typeof f !== "object") return null;
    return {
      ...f,
      id: f?.id ?? f?._id ?? f?.userId ?? f?.username,
      username:
        f?.username ??
        f?.userName ??
        f?.nick ??
        f?.nickname ??
        f?.login ??
        f?.slug ??
        f?.handle ??
        null,
      firstName: f?.firstName ?? f?.first_name,
      lastName: f?.lastName ?? f?.last_name,
      avatarUrl: f?.avatarUrl ?? f?.avatar ?? f?.avatar_url ?? f?.profileImage,
      avatar: f?.avatarUrl ?? f?.avatar ?? f?.avatar_url ?? f?.profileImage,
      online: f?.isOnline === true || f?.online === true,
      isOnline: f?.isOnline === true || f?.online === true,
      lastSeenAt: f?.lastSeenAt ?? null,
      isFollowingMe: f?.isFollowingMe === true,
      amIFollowing: f?.amIFollowing === true,
      isFriend: f?.isFriend === true,
      isVip: f?.isVip === true,
    };
  }).filter(Boolean);
}
