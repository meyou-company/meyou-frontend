import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ProfileHeader from "../../components/Users/Profile/ProfileHome/ProfileHeader";
import ProfileHome from "../../components/Users/Profile/ProfileHome/ProfileHome";
import ProfileVisitorPublic from "../../components/Users/Profile/ProfileVisitorPublic/ProfileVisitorPublic";
import ProfileVisitorSubscribed from "../../components/Users/Profile/ProfileVisitorSubscribed/ProfileVisitorSubscribed";
import ProfileVisitorVip from "../../components/Users/Profile/ProfileVisitorVip/ProfileVisitorVip";
import { applyPublicAudienceFields } from "../../components/Users/Profile/ProfileInfoPanel/profileInfoHelpers";
import VipAccessInfoModal from "../../components/Users/Profile/VipAccessInfoModal/VipAccessInfoModal";
import { useAuthStore } from "../../zustand/useAuthStore";
import { useGuestPreviewStore } from "../../zustand/useGuestPreviewStore";
import { usersApi } from "../../services/usersApi";
import { subscriptionsApi } from "../../services/subscriptionsApi";
import { conversationsApi } from "../../services/conversationsApi";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getFriendsFromUser, getFriendsCountNumber, normalizeFriendsApiResponse } from "../../utils/profileFriends";
import { getViewerIsVipMember, isProfileChatLocked } from "../../utils/profileVipUi";
import { usePresenceStore } from "../../zustand/usePresenceStore";
import {
  findActiveLiveStreamForUser,
  useActiveLiveStreams,
} from "../../hooks/useActiveLiveStreams";
import "../../components/Live/LiveAvatarBadge.scss";
import styles from "./Profile.module.scss";

/** Нормалізація профілю з GET /users/:username (viewType, subscriptionStatus, friendsCount, interests) */
const normalizeProfile = (u) => {
  if (!u) return null;
  const friendsArray = getFriendsFromUser(u);

  const rawFriendsCount = u.friendsCount ?? u.friends_count ?? u.friendsTotal ?? u.friends_total
    ?? u.friends?.total ?? u.friends?.totalCount ?? u.stats?.friendsCount ?? u.stats?.friends_count;
  const friendsCount = getFriendsCountNumber(rawFriendsCount);

  const isOnline = u.isOnline === true || u.online === true;

  return {
    ...u,
    id: u.id ?? u._id,
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    username: u.username || u.nick || u.nickname || u.login || "",
    avatar: u.avatarUrl || u.avatar || "",
    avatarUrl: u.avatarUrl || u.avatar || "",
    isOnline,
    online: isOnline,
    lastSeenAt: isOnline ? null : (u.lastSeenAt ?? null),
    city: u.city || "",
    country: u.country || "",
    bio: u.bio,
    about: u.about,
    gender: u.gender ?? u.profile?.gender ?? u.personalInfo?.gender,
    maritalStatus:
      u.maritalStatus ??
      u.relationshipStatus ??
      u.profile?.maritalStatus ??
      u.profile?.relationshipStatus ??
      u.personalInfo?.maritalStatus,
    relationshipStatus:
      u.relationshipStatus ??
      u.maritalStatus ??
      u.profile?.relationshipStatus ??
      u.profile?.maritalStatus,
    nationality:
      u.nationality ??
      u.profile?.nationality ??
      u.personalInfo?.nationality,
    profession:
      u.profession ??
      u.job ??
      u.profile?.profession ??
      u.personalInfo?.profession,
    job: u.job ?? u.profession,
    languages:
      u.languages ??
      u.profile?.languages ??
      u.personalInfo?.languages,
    telegram: u.telegram ?? u.profile?.telegram,
    instagram: u.instagram ?? u.profile?.instagram,
    profileVisibility:
      u.profileVisibility ??
      u.visibility ??
      u.profile?.profileVisibility ??
      u.profile?.visibility,
    isVerified: u.isVerified,
    /** Інтереси та хобі з бекенду (зберігаються в DTO update-profile) */
    interests: Array.isArray(u.interests) ? u.interests : [],
    hobbies: Array.isArray(u.hobbies) ? u.hobbies : [],
    friends: friendsArray,
    /** Кількість друзів з API (`friendsCount.total` / following) */
    friendsCount,
    postsCount: u.postsCount ?? u.stats?.postsCount,
    giftsCount: u.giftsCount ?? u.stats?.giftsCount,
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username: urlUsername } = useParams();
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const guestPreviewEnabled = useGuestPreviewStore((s) => s.enabled);
  const setGuestPreviewEnabled = useGuestPreviewStore((s) => s.setEnabled);

  const [fetchedUser, setFetchedUser] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  /** Список підписок (following) — для блоку «Друзья» на своєму профілі */
  const [followingList, setFollowingList] = useState([]);
  const [secondaryReady, setSecondaryReady] = useState(false);
  const [vipPurchaseModalOpen, setVipPurchaseModalOpen] = useState(false);
  const [chatLockedModalOpen, setChatLockedModalOpen] = useState(false);
  const friendsFetchKeyRef = useRef(null);

  const urlUsernameNorm = urlUsername?.trim().replace(/^@/, "") || "";
  const isOwnProfile =
    !urlUsernameNorm ||
    (user && (user.username || user.nick || "").toLowerCase() === urlUsernameNorm.toLowerCase());

  /** Guest preview applies only on own profile — disable when navigating away. */
  useEffect(() => {
    if (guestPreviewEnabled && !isOwnProfile) {
      setGuestPreviewEnabled(false);
    }
  }, [guestPreviewEnabled, isOwnProfile, setGuestPreviewEnabled]);

  /** На своєму профілі завантажуємо список підписок (following) для блоку «Друзья» */
  useEffect(() => {
    if (urlUsername || !user) return;
    let cancelled = false;
    subscriptionsApi
      .getFollowing({ take: 200 })
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
      // Не вызываем refreshMe здесь — init() в App.jsx уже делает это
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
        if (!cancelled) {
          usePresenceStore.getState().hydrateMany([
            data,
            ...(Array.isArray(data?.followers) ? data.followers.map((f) => ({
              id: f._id ?? f.id,
              isOnline: f.isOnline,
              lastSeenAt: f.lastSeenAt,
            })) : []),
            ...(Array.isArray(data?.following) ? data.following.map((f) => ({
              id: f._id ?? f.id,
              isOnline: f.isOnline,
              lastSeenAt: f.lastSeenAt,
            })) : []),
          ]);
          setFetchedUser(data);
        }
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
  }, [urlUsernameNorm, urlUsername]);

  /** Підтягуємо friends/following один раз, якщо в профілі лише лічильник без списку */
  useEffect(() => {
    if (!urlUsernameNorm || !fetchedUser?.id) return;

    const friendsFromProfile = getFriendsFromUser(fetchedUser);
    const count = getFriendsCountNumber(
      fetchedUser?.friendsCount ?? fetchedUser?.friends_count,
    );
    if (friendsFromProfile.length > 0 || !(typeof count === "number" && count > 0)) {
      return;
    }

    const fetchKey = `${urlUsernameNorm}:${fetchedUser.id}`;
    if (friendsFetchKeyRef.current === fetchKey) return;
    friendsFetchKeyRef.current = fetchKey;

    let cancelled = false;
    const mergeFriendsList = (items) => {
      if (cancelled || !Array.isArray(items) || items.length === 0) return;
      setFetchedUser((prev) => (prev ? { ...prev, following: items } : null));
    };

    usersApi
      .getUserFollowing(urlUsernameNorm)
      .then((res) => mergeFriendsList(normalizeFriendsApiResponse(res)))
      .catch(() =>
        usersApi
          .getUserFriends(urlUsernameNorm)
          .then((res) => mergeFriendsList(normalizeFriendsApiResponse(res)))
          .catch(() => { }),
      );

    return () => {
      cancelled = true;
    };
  }, [urlUsernameNorm, fetchedUser?.id, fetchedUser?.friendsCount, fetchedUser?.friends_count]);

  // Редирект делает ProfileGuard в AppRouter, здесь не нужен
  // useEffect(() => {
  //   if (!urlUsername && !isAuthLoading && !user) {
  //     navigate("/auth/login", { replace: true });
  //   }
  // }, [urlUsername, isAuthLoading, user, navigate]);

  const profileUser = useMemo(() => {
    if (urlUsername && fetchedUser) return normalizeProfile(fetchedUser);
    if (!urlUsername && user) return normalizeProfile(user);
    return null;
  }, [urlUsername, fetchedUser, user]);

  const { activeStreams } = useActiveLiveStreams({ enabled: Boolean(urlUsernameNorm) });
  const activeProfileLiveStream = useMemo(
    () => (isOwnProfile ? null : findActiveLiveStreamForUser(activeStreams, profileUser)),
    [activeStreams, isOwnProfile, profileUser],
  );
  const onOpenLive = useCallback((liveStream) => {
    if (!liveStream?.id) return;
    navigate(`/live/${encodeURIComponent(liveStream.id)}`, {
      state: { mode: "viewer", host: liveStream.host || profileUser },
    });
  }, [navigate, profileUser]);

  useEffect(() => {
    if (!profileUser?.id) {
      setSecondaryReady(false);
      return;
    }
    setSecondaryReady(false);
    const frameId = requestAnimationFrame(() => setSecondaryReady(true));
    return () => cancelAnimationFrame(frameId);
  }, [profileUser?.id]);

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
        }).catch(() => { });
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
  /** На сторінці іншого юзера клік по домику — повернути на мій профіль */
  const onGoToMyProfile = useCallback(() => navigate("/profile"), [navigate]);
  const onMessagesTop = useCallback(() => navigate("/messages"), [navigate]);
  const onWallet = useCallback(() => navigate("/wallet"), [navigate]);

  const onNav = useCallback((path) => navigate(path), [navigate]);

  const onWriteMessage = useCallback(async () => {
    if (!profileUser?.id) return;

    if (!useAuthStore.getState().isAuthed) {
      navigate("/auth/login", {
        state: { redirectTo: `/profile/${profileUser.username || profileUser.id}` },
      });
      return;
    }

    // VIP-protected profile: non-members cannot open/create chat (UX lock).
    // Backend membership/access-control is still required for production.
    if (
      isProfileChatLocked({
        user: profileUser,
        isOwnProfile: false,
      })
    ) {
      setChatLockedModalOpen(true);
      return;
    }

    try {
      const conversation = await conversationsApi.create(profileUser.id);
      if (!conversation?.id) {
        throw new Error("Conversation id missing");
      }
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      console.error("[profile] open conversation failed", err);
      toast.error(getApiErrorMessage(err) || t('profile.toast.openChatError'));
    }
  }, [navigate, profileUser, t]);

  const openVipPurchaseFromChatLock = useCallback(() => {
    setChatLockedModalOpen(false);
    setVipPurchaseModalOpen(true);
  }, []);

  // ✅ handlers для Home
  const onEditProfile = useCallback(() => navigate("/users/profile/edit"), [navigate]);
  const onMessages = useCallback(() => navigate("/messages"), [navigate]);
  const onSaved = useCallback(() => navigate("/saved"), [navigate]);
  const onOpenUser = useCallback((username) => {
    if (username) navigate(`/profile/${username}`);
  }, [navigate]);
  const onShowMore = useCallback(() => navigate("/friends"), [navigate]);
  /** На сторінці друга: «Показать больше» веде до списку його друзів */
  const onShowMoreFriendFriends = useCallback(() => {
    if (profileUser?.username) navigate(`/profile/${profileUser.username}/friends`);
  }, [profileUser?.username, navigate]);
  /** Якщо немає друзів — кнопка «Знайти друзів» веде на пошук */
  const onFindFriends = useCallback(() => navigate("/search"), [navigate]);
  const onAddToVip = useCallback(() => {
    // Payment not wired yet — informational / pre-payment modal only.
    setVipPurchaseModalOpen(true);
  }, []);
  const onMyGifts = useCallback(() => navigate("/my-gifts"), [navigate]);
  const onGifts = useCallback(() => { }, []);
  const onReport = useCallback(() => { }, []);
  const onBlock = useCallback(() => { }, []);

  const isGuestPreview = Boolean(isOwnProfile && guestPreviewEnabled);

  const guestPreviewUser = useMemo(() => {
    if (!isGuestPreview || !profileUser) return null;
    const friendsFromFollowing = Array.isArray(followingList)
      ? followingList
      : [];
    return applyPublicAudienceFields({
      ...profileUser,
      friends:
        friendsFromFollowing.length > 0
          ? friendsFromFollowing
          : profileUser.friends,
    });
  }, [isGuestPreview, profileUser, followingList]);

  const exitGuestPreview = useCallback(() => {
    setGuestPreviewEnabled(false);
  }, [setGuestPreviewEnabled]);

  const noopGuestAction = useCallback(() => {
    toast.message(t('profile.guestPreview.actionDisabled'));
  }, [t]);

  const loadingOwn = !urlUsername && !user;
  const loadingPublic = urlUsername && fetchedUser === null && !fetchError;

  if (!urlUsername && !isAuthLoading && !user) return null;

  const headerVariant = isOwnProfile && !isGuestPreview ? "owner" : "friend";
  const currentUserAvatar = user?.avatarUrl || user?.avatar;

  if (loadingOwn || loadingPublic) {
    return (
      <div className={styles.page}>
        <ProfileHeader
          variant={headerVariant}
          currentUserAvatar={currentUserAvatar}
          onSearch={onSearch}
          onGoHome={onGoHome}
          onGoToMyProfile={onGoToMyProfile}
          onMessagesTop={onMessagesTop}
          onWallet={onWallet}
          onNav={onNav}
        />
        <div className={styles.loading}>{t('profile.loading')}</div>
      </div>
    );
  }

  if (urlUsername && fetchError) {
    return (
      <div className={styles.page}>
        <ProfileHeader
          variant={headerVariant}
          currentUserAvatar={currentUserAvatar}
          onSearch={onSearch}
          onGoHome={onGoHome}
          onGoToMyProfile={onGoToMyProfile}
          onMessagesTop={onMessagesTop}
          onWallet={onWallet}
          onNav={onNav}
        />
        <div className={styles.content}>
          <div className={styles.loading}>
            {fetchError === "not_found"
              ? t('profile.notFound', {
                username: urlUsername ? `: @${urlUsername}` : "",
              })
              : t('profile.loadError')}
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) return null;

  // 4 стани профілю: owner | public | subscribed/friend | vip member
  // Guest preview forces the public (non-friend) visitor layout.
  const isOwner = isOwnProfile && !isGuestPreview;
  const isVipMember = !isGuestPreview && getViewerIsVipMember(profileUser);
  const isFriendOrSubscribed =
    !isOwner && !isGuestPreview && isSubscribed && !isVipMember;

  const renderProfileContent = () => {
    if (isGuestPreview && guestPreviewUser) {
      return (
        <ProfileVisitorPublic
          user={guestPreviewUser}
          postsAuthorId={guestPreviewUser.id}
          loadSecondary={secondaryReady}
          onSubscribe={noopGuestAction}
          subscriptionLoading={false}
          onOpenUser={onOpenUser}
          onShowMore={onShowMore}
          onFindFriends={onFindFriends}
          onReport={noopGuestAction}
          onAddToVip={noopGuestAction}
          onBlock={noopGuestAction}
          onWriteMessage={noopGuestAction}
          guestPreview
        />
      );
    }
    if (isOwner) {
      return (
        <ProfileHome
          user={profileUser}
          postsAuthorId={profileUser.id}
          loadSecondary={secondaryReady}
          followingList={followingList}
          onOpenUser={onOpenUser}
          onShowMore={onShowMore}
          onFindFriends={onFindFriends}
          refreshMe={refreshMe}
          onEditProfile={onEditProfile}
          onMessages={onMessages}
          onGifts={onMyGifts}
          onSaved={onSaved}
          onWallet={onWallet}
        />
      );
    }
    if (isVipMember) {
      return (
        <ProfileVisitorVip
          user={profileUser}
          activeLiveStream={activeProfileLiveStream}
          onOpenLive={onOpenLive}
          onUnsubscribe={handleSubscribe}
          onVipChat={onWriteMessage}
          onWriteMessage={onWriteMessage}
          onGifts={onGifts}
          onReport={onReport}
          onShowMoreFriends={onShowMoreFriendFriends}
          onOpenUser={onOpenUser}
          followingList={profileUser?.friends}
        />
      );
    }
    if (isFriendOrSubscribed) {
      return (
        <ProfileVisitorSubscribed
          user={profileUser}
          activeLiveStream={activeProfileLiveStream}
          onOpenLive={onOpenLive}
          postsAuthorId={profileUser.id}
          loadSecondary={secondaryReady}
          friendsCount={profileUser?.friendsCount}
          onAddToVip={onAddToVip}
          onUnsubscribe={handleSubscribe}
          onVipChat={onWriteMessage}
          onWriteMessage={onWriteMessage}
          onGifts={onGifts}
          onReport={onReport}
          onShowMoreFriends={onShowMoreFriendFriends}
          onOpenUser={onOpenUser}
        />
      );
    }
    // isPublic
    return (
      <ProfileVisitorPublic
        user={profileUser}
        activeLiveStream={activeProfileLiveStream}
        onOpenLive={onOpenLive}
        postsAuthorId={profileUser.id}
        loadSecondary={secondaryReady}
        onSubscribe={handleSubscribe}
        subscriptionLoading={subscriptionLoading}
        onOpenUser={onOpenUser}
        onShowMore={onShowMoreFriendFriends}
        onFindFriends={onFindFriends}
        onReport={onReport}
        onAddToVip={onAddToVip}
        onBlock={onBlock}
        onWriteMessage={onWriteMessage}
      />
    );
  };

  return (
    <div className={styles.page}>
      <ProfileHeader
        variant={headerVariant}
        currentUserAvatar={currentUserAvatar}
        onSearch={onSearch}
        onGoHome={onGoHome}
        onGoToMyProfile={onGoToMyProfile}
        onMessagesTop={onMessagesTop}
        onWallet={onWallet}
        onNav={onNav}
      />
      {isGuestPreview ? (
        <div className={styles.guestPreviewBanner} role="status">
          <span className={styles.guestPreviewBanner__text}>
            {t('profile.guestPreview.banner')}
          </span>
          <button
            type="button"
            className={styles.guestPreviewBanner__exit}
            onClick={exitGuestPreview}
          >
            {t('profile.guestPreview.exit')}
          </button>
        </div>
      ) : null}
      <div className={styles.content}>{renderProfileContent()}</div>
      <VipAccessInfoModal
        isOpen={chatLockedModalOpen}
        onClose={() => setChatLockedModalOpen(false)}
        variant="chatLocked"
        onGetVip={openVipPurchaseFromChatLock}
      />
      <VipAccessInfoModal
        isOpen={vipPurchaseModalOpen}
        onClose={() => setVipPurchaseModalOpen(false)}
        variant="purchase"
      />
    </div>
  );
}
