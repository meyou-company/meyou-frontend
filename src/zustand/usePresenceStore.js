import { create } from 'zustand';

/**
 * Central presence cache: userId → { isOnline, lastSeenAt }.
 * Seeded from API payloads; updated live via `user:presence-changed`.
 */
export const usePresenceStore = create((set, get) => ({
  byUserId: {},

  setPresence(userId, { isOnline, lastSeenAt }) {
    if (!userId) return;
    const id = String(userId);
    set((state) => ({
      byUserId: {
        ...state.byUserId,
        [id]: {
          isOnline: Boolean(isOnline),
          lastSeenAt: isOnline ? null : (lastSeenAt ?? null),
        },
      },
    }));
  },

  /** Merge many users from REST lists without wiping unrelated entries. */
  hydrateMany(users) {
    if (!Array.isArray(users) || users.length === 0) return;
    set((state) => {
      const next = { ...state.byUserId };
      for (const u of users) {
        const id = u?.id ?? u?._id;
        if (!id) continue;
        const key = String(id);
        const hasOnline =
          typeof u.isOnline === 'boolean' || typeof u.online === 'boolean';
        if (!hasOnline && u.lastSeenAt === undefined) continue;
        const isOnline =
          typeof u.isOnline === 'boolean'
            ? u.isOnline
            : typeof u.online === 'boolean'
              ? u.online
              : false;
        next[key] = {
          isOnline,
          lastSeenAt: isOnline ? null : (u.lastSeenAt ?? next[key]?.lastSeenAt ?? null),
        };
      }
      return { byUserId: next };
    });
  },

  getPresence(userId) {
    if (!userId) return { isOnline: false, lastSeenAt: null };
    return (
      get().byUserId[String(userId)] ?? { isOnline: false, lastSeenAt: null }
    );
  },

  clear() {
    set({ byUserId: {} });
  },
}));

/** Resolve online flag from store + optional user object fallback (never default to true). */
export function resolveIsOnline(userId, user) {
  const fromStore = usePresenceStore.getState().byUserId[String(userId ?? '')];
  if (fromStore) return fromStore.isOnline;
  if (typeof user?.isOnline === 'boolean') return user.isOnline;
  if (typeof user?.online === 'boolean') return user.online;
  return false;
}

export function resolveLastSeenAt(userId, user) {
  const fromStore = usePresenceStore.getState().byUserId[String(userId ?? '')];
  if (fromStore) return fromStore.lastSeenAt;
  if (user?.lastSeenAt != null) return user.lastSeenAt;
  return null;
}
