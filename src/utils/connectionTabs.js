export const CONNECTION_TAB_IDS = ["friends", "followers", "following", "vip"];

export const CONNECTION_TABS = [
  {
    id: "friends",
    labelKey: "friends.page.tabFriends",
    emptyKey: "friends.page.emptyFriends",
    action: "unsubscribe",
  },
  {
    id: "followers",
    labelKey: "friends.page.tabFollowers",
    emptyKey: "friends.page.emptyFollowers",
    action: "subscribe",
  },
  {
    id: "following",
    labelKey: "friends.page.tabFollowing",
    emptyKey: "friends.page.emptyFollowing",
    action: "unsubscribe",
  },
  {
    id: "vip",
    labelKey: "friends.page.tabVip",
    emptyKey: "friends.page.emptyVip",
    action: null,
  },
];

export const EMPTY_CONNECTION_COUNTS = {
  friends: 0,
  followers: 0,
  following: 0,
  vip: 0,
};

export function actionForConnectionTab(tabId) {
  const tab = CONNECTION_TABS.find((item) => item.id === tabId);
  return tab?.action ?? null;
}

export function normalizeConnectionCounts(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    friends: Number.isFinite(source.friends) ? source.friends : 0,
    followers: Number.isFinite(source.followers) ? source.followers : 0,
    following: Number.isFinite(source.following) ? source.following : 0,
    vip: Number.isFinite(source.vip) ? source.vip : 0,
  };
}
