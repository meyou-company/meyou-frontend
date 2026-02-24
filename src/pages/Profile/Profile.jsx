import { useEffect, useMemo, useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProfileHeader from "../../components/Users/Profile/ProfileHome/ProfileHeader";
import ProfileHome from "../../components/Users/Profile/ProfileHome/ProfileHome";
import ProfileVisitorSubscribed from "../../components/Users/Profile/ProfileVisitorSubscribed/ProfileVisitorSubscribed";
import { useAuthStore } from "../../zustand/useAuthStore";
import { usersApi } from "../../services/usersApi";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import styles from "./Profile.module.scss";

/** Нормалізація профілю з GET /users/:username (viewType, subscriptionStatus з бекенду) */
const normalizeProfile = (u) => {
  if (!u) return null;
  return {
    id: u.id,
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    username: u.username || u.nick || u.nickname || u.login || "",
    avatar: u.avatarUrl || u.avatar || "",
    avatarUrl: u.avatarUrl || u.avatar || "",
    city: u.city || "",
    country: u.country || "",
    bio: u.bio,
    isVerified: u.isVerified,
    friends: u.friends ?? [],
    viewType: u.viewType,
    subscriptionStatus: u.subscriptionStatus
      ? {
          isSubscribed: u.subscriptionStatus.isSubscribed === true,
          isBlocked: u.subscriptionStatus.isBlocked === true,
        }
      : undefined,
  };
};

export default function Profile() {
  const navigate = useNavigate();
  const { username: urlUsername } = useParams();
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [fetchedUser, setFetchedUser] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  /** Список підписок (following) — для блоку «Друзья» на своєму профілі */
  const [followingList, setFollowingList] = useState([]);

  const urlUsernameNorm = urlUsername?.trim().replace(/^@/, "") || "";
  const isOwnProfile =
    !urlUsernameNorm ||
    (user && (user.username || user.nick || "").toLowerCase() === urlUsernameNorm.toLowerCase());

  /** На своєму профілі завантажуємо список підписок (following) для блоку «Друзья» */
  useEffect(() => {
    if (urlUsername || !user) return;
    let cancelled = false;
    subscriptionsApi
      .getFollowing({ take: 50 })
      .then((res) => {
        const data = res?.data ?? res;
        const items = data?.items ?? [];
        if (!cancelled) setFollowingList(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setFollowingList([]);
      });
    return () => { cancelled = true; };
  }, [urlUsername, user?.id]);

  useEffect(() => {
    if (!urlUsername) {
      if (!user && !isAuthLoading) refreshMe?.().catch(() => {});
      return;
    }
    if (!urlUsernameNorm) {
      setFetchError("not_found");
      setFetchedUser(null);
      return;
    }
    let cancelled = false;
    setFetchError(null);

    const fetchProfile = (username) =>
      usersApi.getByUsername(username).then((res) => {
        const data = res?.data ?? res;
        if (!cancelled) setFetchedUser(data);
      });

    const firstTry = urlUsernameNorm;
    fetchProfile(firstTry).catch((e) => {
      if (cancelled) return;
      if (e?.response?.status === 404) {
        const lower = firstTry.toLowerCase();
        if (lower !== firstTry) {
          fetchProfile(lower).catch((err) => {
            if (!cancelled) {
              setFetchError(err?.response?.status === 404 ? "not_found" : "error");
              setFetchedUser(null);
            }
          });
          return;
        }
      }
      setFetchError(e?.response?.status === 404 ? "not_found" : "error");
      setFetchedUser(null);
    });

    return () => { cancelled = true; };
  }, [urlUsernameNorm, urlUsername, user]);

  useEffect(() => {
    if (!urlUsername && !isAuthLoading && !user) {
      navigate("/auth/login", { replace: true });
    }
  }, [urlUsername, isAuthLoading, user, navigate]);

  const profileUser = useMemo(() => {
    if (urlUsername && fetchedUser) return normalizeProfile(fetchedUser);
    if (!urlUsername && user) return normalizeProfile(user);
    return null;
  }, [urlUsername, fetchedUser, user]);

  const isSubscribed = profileUser?.subscriptionStatus?.isSubscribed === true;

  const handleSubscribe = useCallback(async () => {
    if (!profileUser?.id) return;
    setSubscriptionLoading(true);
    try {
      if (isSubscribed) {
        await subscriptionsApi.unsubscribe(profileUser.id);
        setFetchedUser((prev) => prev ? { ...prev, subscriptionStatus: { ...prev.subscriptionStatus, isSubscribed: false } } : null);
      } else {
        await subscriptionsApi.subscribe(profileUser.id);
        setFetchedUser((prev) => prev ? { ...prev, subscriptionStatus: { ...prev.subscriptionStatus, isSubscribed: true } } : null);
      }
      if (!urlUsername && user) {
        refreshMe?.();
        subscriptionsApi.getFollowing({ take: 50 }).then((res) => {
          const data = res?.data ?? res;
          const items = data?.items ?? [];
          setFollowingList(Array.isArray(items) ? items : []);
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [profileUser?.id, isSubscribed, urlUsername, user, refreshMe]);

  // ✅ handlers для Header
  const onSearch = useCallback(() => navigate("/search"), [navigate]);
  const onGoHome = useCallback(() => navigate("/"), [navigate]);
  const onMessagesTop = useCallback(() => navigate("/messages"), [navigate]);
  const onWallet = useCallback(() => navigate("/wallet"), [navigate]);

  const onNav = useCallback((path) => navigate(path), [navigate]);

  // ✅ handlers для Home
  const onEditProfile = useCallback(() => navigate("/users/profile/edit"), [navigate]);
  const onMessages = useCallback(() => navigate("/vip-chat"), [navigate]);
  const onSaved = useCallback(() => navigate("/saved"), [navigate]);
  const onOpenUser = useCallback((username) => {
    if (username) navigate(`/profile/${username}`);
  }, [navigate]);
  const onShowMore = useCallback(() => navigate("/friends"), [navigate]);
  /** Якщо немає друзів — кнопка «Знайти друзів» веде на пошук */
  const onFindFriends = useCallback(() => navigate("/search"), [navigate]);
  const onAddToVip = useCallback(() => navigate("/friends"), [navigate]);
  const onGifts = useCallback(() => {}, []);
  const onReport = useCallback(() => {}, []);

  const loadingOwn = !urlUsername && (!user || isAuthLoading);
  const loadingPublic = urlUsername && fetchedUser === null && !fetchError;

  if (!urlUsername && !isAuthLoading && !user) return null;

  if (loadingOwn || loadingPublic) {
    return (
      <div className={styles.page}>
        <ProfileHeader
          onSearch={onSearch}
          onGoHome={onGoHome}
          onMessagesTop={onMessagesTop}
          onWallet={onWallet}
          onNav={onNav}
        />
        <div className={styles.loading}>Завантаження профілю…</div>
      </div>
    );
  }

  if (urlUsername && fetchError) {
    return (
      <div className={styles.page}>
        <ProfileHeader
          onSearch={onSearch}
          onGoHome={onGoHome}
          onMessagesTop={onMessagesTop}
          onWallet={onWallet}
          onNav={onNav}
        />
        <div className={styles.content}>
          <div className={styles.loading}>
            {fetchError === "not_found"
              ? `Профіль не знайдено${urlUsername ? `: @${urlUsername}` : ""}`
              : "Помилка завантаження"}
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  const showSubscribedView = !isOwnProfile && isSubscribed;

  return (
    <div className={styles.page}>
      <ProfileHeader
        onSearch={onSearch}
        onGoHome={onGoHome}
        onMessagesTop={onMessagesTop}
        onWallet={onWallet}
        onNav={onNav}
      />
      <div className={styles.content}>
        {showSubscribedView ? (
          <ProfileVisitorSubscribed
            user={profileUser}
            onAddToVip={onAddToVip}
            onUnsubscribe={handleSubscribe}
            onVipChat={() => navigate("/vip-chat")}
            onGifts={onGifts}
            onReport={onReport}
            onShowMoreFriends={onShowMore}
            onOpenUser={onOpenUser}
          />
        ) : (
          <ProfileHome
            user={profileUser}
            viewType={profileUser.viewType}
            isSubscribed={isSubscribed}
            onSubscribe={handleSubscribe}
            subscriptionLoading={subscriptionLoading}
            followingList={isOwnProfile ? followingList : undefined}
            onOpenUser={onOpenUser}
            onShowMore={onShowMore}
            onFindFriends={onFindFriends}
            refreshMe={refreshMe}
            onEditProfile={onEditProfile}
            onMessages={onMessages}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}
