export function normalizeBlockedUsers(response) {
  const value = response?.data ?? response;
  const items = Array.isArray(value)
    ? value
    : [value?.blockedUsers, value?.users, value?.items, value?.results, value?.blocked].find(Array.isArray) ?? [];
  const users = new Map();

  for (const item of items) {
    const nested = item?.blockedUser ?? item?.blocked ?? item?.user;
    const profile = nested && typeof nested === 'object' ? nested : item;
    // A block record can have its own id, distinct from the target user.
    const id = item?.blockedUserId ?? item?.blockedId ??
      (typeof nested === 'string' ? nested : nested?.id ?? nested?._id) ??
      item?.userId ?? profile?.id ?? profile?._id ??
      (typeof item === 'string' ? item : null);
    if (id != null && id !== '') users.set(String(id), { ...profile, id });
  }

  return [...users.values()];
}
